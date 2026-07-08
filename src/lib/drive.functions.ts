import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const FOLDER_NAME = "CoLab Nation — Applicants";

async function driveFetch(path: string, init: RequestInit = {}) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const driveKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lovableKey || !driveKey) {
    throw new Error("Google Drive is not configured. Ask an admin to reconnect it.");
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${lovableKey}`);
  headers.set("X-Connection-Api-Key", driveKey);
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive request failed [${res.status}]: ${body}`);
  }
  return res;
}

async function ensureApplicantsFolder(): Promise<string> {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const searchRes = await driveFetch(`/drive/v3/files?q=${q}&fields=files(id,name)&pageSize=1`);
  const search = (await searchRes.json()) as { files?: { id: string }[] };
  if (search.files && search.files.length > 0) return search.files[0].id;

  const createRes = await driveFetch(`/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

const uploadInput = z.object({
  filename: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  // base64-encoded file bytes
  contentBase64: z.string().min(1),
});

export const uploadResumeToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => uploadInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const folderId = await ensureApplicantsFolder();

    const safeName = `${userId.slice(0, 8)}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const metadata = {
      name: safeName,
      parents: [folderId],
      mimeType: data.mimeType,
    };

    const boundary = `-------lovable${Math.random().toString(36).slice(2)}`;
    const bytes = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));

    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        `Content-Type: ${data.mimeType}\r\n\r\n`,
    );
    const tail = enc.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(head.length + bytes.length + tail.length);
    body.set(head, 0);
    body.set(bytes, head.length);
    body.set(tail, head.length + bytes.length);

    const uploadRes = await driveFetch(
      `/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    );
    const uploaded = (await uploadRes.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
    };

    // Best-effort: allow anyone with link to read (so admins can open it)
    try {
      await driveFetch(`/drive/v3/files/${uploaded.id}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "reader", type: "anyone" }),
      });
    } catch {
      // non-fatal
    }

    return {
      fileId: uploaded.id,
      name: uploaded.name,
      webViewLink: uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`,
    };
  });
