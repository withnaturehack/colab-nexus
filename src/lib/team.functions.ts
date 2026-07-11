import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum([
    "super_admin",
    "technical_head",
    "content_head",
    "marketing_head",
    "pr_head",
    "event_head",
    "member",
  ]),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (data !== true) throw new Error("Only super admins can manage roles");
}

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => roleInput.parse(raw))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      title: "New role assigned",
      message: `You have been granted the ${data.role.replace(/_/g, " ")} role.`,
      type: "success",
      link: "/dashboard",
    });
    return { ok: true };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => roleInput.parse(raw))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw error;
    return { ok: true };
  });

const createUserInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(100),
  department: z.enum(["technical", "content_design", "marketing", "pr", "events"]).optional(),
  role: z.enum([
    "super_admin",
    "technical_head",
    "content_head",
    "marketing_head",
    "pr_head",
    "event_head",
    "member",
  ]),
});

export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => createUserInput.parse(raw))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createErr || !created.user) throw new Error(createErr?.message ?? "Failed to create user");

    const newId = created.user.id;

    // Ensure profile exists (trigger should create it), then activate + set department
    await supabaseAdmin.from("profiles").upsert({
      id: newId,
      email: data.email,
      full_name: data.full_name,
      status: "active",
      department: data.department ?? null,
    });

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) throw roleErr;

    await supabaseAdmin.from("notifications").insert({
      user_id: newId,
      title: "Welcome to CoLab Nation",
      message: `Your account has been created with the ${data.role.replace(/_/g, " ")} role.`,
      type: "success",
      link: "/dashboard",
    });

    return { ok: true, userId: newId };
  });
