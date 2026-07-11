import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public: uploads an applicant's resume to Supabase Storage (private "resumes"
// bucket) and returns a long-lived signed URL admins can open from the
// applications review screen. No auth middleware here — same reasoning as
// submitApplication in bootstrap.functions.ts: right after signUp the user
// has no session yet because email confirmation is required, so this must be
// reachable without a Bearer token. Replaces the old Google Drive upload that
// went through Lovable's connector gateway (connector-gateway.lovable.dev),
// which only works inside Lovable Cloud.
const uploadInput = z.object({
  email: z.string().email(),
  filename: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  // base64-encoded file bytes
  contentBase64: z.string().min(1),
});

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5; // 5 years

export const uploadResume = createServerFn({ method: "POST" })
  .validator((raw: unknown) => uploadInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const bytes = Uint8Array.from(atob(data.contentBase64), (c) => c.charCodeAt(0));
    const safeName = `${Date.now()}-${data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const path = `${data.email.toLowerCase()}/${safeName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("resumes")
      .upload(path, bytes, { contentType: data.mimeType, upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("resumes")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed) throw new Error(signErr?.message ?? "Could not create resume link");

    return { path, webViewLink: signed.signedUrl };
  });
