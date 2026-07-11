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
  .validator((raw: unknown) => roleInput.parse(raw))
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
  .validator((raw: unknown) => roleInput.parse(raw))
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
