import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const approveInput = z.object({
  applicationId: z.string().uuid(),
  department: z.enum(["technical", "content_design", "marketing", "pr", "events"]),
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

const rejectInput = z.object({
  applicationId: z.string().uuid(),
  note: z.string().max(2000).optional(),
});

const updateStatusInput = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(["pending", "under_review", "interview", "assignment", "accepted", "rejected", "onboarded"]),
  note: z.string().max(2000).optional(),
});

async function requireAdminOrHead(supabase: ReturnType<typeof getSupa>, userId: string, applicationDept: string) {
  const { data: adminCheck } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (adminCheck === true) return true;
  const roleName = ({
    technical: "technical_head",
    content_design: "content_head",
    marketing: "marketing_head",
    pr: "pr_head",
    events: "event_head",
  } as const)[applicationDept as "technical"];
  if (!roleName) return false;
  const { data: headCheck } = await supabase.rpc("has_role", { _user_id: userId, _role: roleName });
  return headCheck === true;
}
// helper type inference
type SupaLike = { rpc: (...args: unknown[]) => Promise<{ data: unknown }> };
function getSupa(): SupaLike { throw new Error("type-only"); }

export const approveApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => approveInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: app, error: appErr } = await supabase
      .from("applications")
      .select("id, user_id, department_applied, status")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app) throw new Error("Application not found");

    // Only super_admin OR the head of the applied department can approve
    const { data: isSuper } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    let allowed = isSuper === true;
    if (!allowed) {
      const headRole = ({
        technical: "technical_head",
        content_design: "content_head",
        marketing: "marketing_head",
        pr: "pr_head",
        events: "event_head",
      } as const)[app.department_applied as "technical"];
      if (headRole) {
        const { data: isHead } = await supabase.rpc("has_role", { _user_id: userId, _role: headRole });
        allowed = isHead === true;
      }
    }
    if (!allowed) throw new Error("Forbidden");

    // Load admin client for privileged writes (user_roles, profile activation)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const fromStatus = app.status;

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ status: "active", department: data.department })
      .eq("id", app.user_id);
    if (profileErr) throw profileErr;

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: app.user_id, role: data.role });
    if (roleErr && !roleErr.message.includes("duplicate")) throw roleErr;

    const { error: appUpdateErr } = await supabaseAdmin
      .from("applications")
      .update({ status: "accepted", reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", app.id);
    if (appUpdateErr) throw appUpdateErr;

    await supabaseAdmin.from("application_status_history").insert({
      application_id: app.id,
      from_status: fromStatus,
      to_status: "accepted",
      changed_by: userId,
      note: `Approved as ${data.role} in ${data.department}`,
    });

    await supabaseAdmin.from("notifications").insert({
      user_id: app.user_id,
      title: "🎉 Application approved",
      message: `Welcome to CoLab Nation — you've been added to the ${data.department.replace("_", " ")} team as ${data.role.replace(/_/g, " ")}.`,
      type: "success",
      link: "/dashboard",
    });

    return { ok: true };
  });

export const rejectApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => rejectInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: app } = await supabase
      .from("applications")
      .select("id, user_id, department_applied, status")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!app) throw new Error("Application not found");

    const { data: isSuper } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    let allowed = isSuper === true;
    if (!allowed) {
      const headRole = ({
        technical: "technical_head",
        content_design: "content_head",
        marketing: "marketing_head",
        pr: "pr_head",
        events: "event_head",
      } as const)[app.department_applied as "technical"];
      if (headRole) {
        const { data: isHead } = await supabase.rpc("has_role", { _user_id: userId, _role: headRole });
        allowed = isHead === true;
      }
    }
    if (!allowed) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ status: "rejected" }).eq("id", app.user_id);
    await supabaseAdmin
      .from("applications")
      .update({ status: "rejected", reviewed_by: userId, reviewed_at: new Date().toISOString(), internal_notes: data.note ?? null })
      .eq("id", app.id);
    await supabaseAdmin.from("application_status_history").insert({
      application_id: app.id,
      from_status: app.status,
      to_status: "rejected",
      changed_by: userId,
      note: data.note ?? null,
    });
    await supabaseAdmin.from("notifications").insert({
      user_id: app.user_id,
      title: "Application update",
      message: data.note
        ? `Your application was not accepted. Note from the team: ${data.note}`
        : "Your application was not accepted at this time. Thank you for applying.",
      type: "warning",
    });
    return { ok: true };
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => updateStatusInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: app } = await supabase
      .from("applications")
      .select("id, department_applied, status")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (!app) throw new Error("Application not found");

    const { data: isSuper } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
    let allowed = isSuper === true;
    if (!allowed) {
      const headRole = ({
        technical: "technical_head",
        content_design: "content_head",
        marketing: "marketing_head",
        pr: "pr_head",
        events: "event_head",
      } as const)[app.department_applied as "technical"];
      if (headRole) {
        const { data: isHead } = await supabase.rpc("has_role", { _user_id: userId, _role: headRole });
        allowed = isHead === true;
      }
    }
    if (!allowed) throw new Error("Forbidden");

    const { error } = await supabase
      .from("applications")
      .update({ status: data.status })
      .eq("id", app.id);
    if (error) throw error;

    await supabase.from("application_status_history").insert({
      application_id: app.id,
      from_status: app.status,
      to_status: data.status,
      changed_by: userId,
      note: data.note ?? null,
    });
    return { ok: true };
  });

// Bootstrap: promote self to super_admin if there are no super_admins yet.
// This lets the first user of a fresh workspace claim the org.
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");
    if ((count ?? 0) > 0) throw new Error("A Super Admin already exists");
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "super_admin" });
    await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", userId);
    // Best-effort: also accept the caller's own application if pending
    await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("user_id", userId);
    return { ok: true };
  });
