import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// One-shot bootstrap: creates the seeded super admin account if missing.
// Safe to call multiple times — it's a no-op once the account exists.
// Callable without auth so the very first admin can be created.
export const seedSuperAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const email = "colabnation@gmail.in";
  const password = "54321";
  const fullName = "CoLab Nation Admin";

  // Look for an existing user with this email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: list } = await (supabaseAdmin.auth.admin as any).listUsers({ page: 1, perPage: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = list?.users?.find((u: any) => u.email === email);

  let userId = existing?.id as string | undefined;

  if (!userId) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr || !created.user) {
      return { ok: false, message: createErr?.message ?? "Could not create seed user" };
    }
    userId = created.user.id;
  } else {
    // Ensure email is confirmed and password is set
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
  }

  // Ensure profile is active
  await supabaseAdmin.from("profiles").upsert({
    id: userId!,
    email,
    full_name: fullName,
    status: "active",
  });

  // Grant super_admin role (idempotent via unique constraint)
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId!, role: "super_admin" });
  if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
    return { ok: false, message: roleErr.message };
  }

  return { ok: true, email };
});

const resendInput = z.object({ email: z.string().email() });

export const resendVerificationEmail = createServerFn({ method: "POST" })
  .validator((raw: unknown) => resendInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: data.email,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });

const applicationInput = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  phone: z.string().nullable().optional(),
  college: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  department_applied: z.enum(["technical", "content_design", "marketing", "pr", "events"]),
  portfolio_url: z.string().nullable().optional(),
  github_url: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  resume_url: z.string().nullable().optional(),
  skills: z.array(z.string()).optional().default([]),
  bio: z.string().nullable().optional(),
  experience: z.string().nullable().optional(),
  availability: z.string().nullable().optional(),
  agreed_terms: z.literal(true),
});

// Public: creates the application row after client-side signUp. Since email
// confirmation is required, the just-signed-up user has no session yet, so a
// direct client insert (RLS: authenticated + user_id = auth.uid()) 401s.
// We look the user up by email via admin and insert on their behalf.
export const submitApplication = createServerFn({ method: "POST" })
  .validator((raw: unknown) => applicationInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find the auth user by email (paginate defensively)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let user: any = null;
    for (let page = 1; page <= 10 && !user; page++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: list, error } = await (supabaseAdmin.auth.admin as any).listUsers({ page, perPage: 200 });
      if (error) return { ok: false, message: error.message };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user = list?.users?.find((u: any) => (u.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (!list?.users?.length || list.users.length < 200) break;
    }
    if (!user) return { ok: false, message: "Account not found. Please sign up again." };

    // Skip if this user already has an application
    const { data: existing } = await supabaseAdmin
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) return { ok: true, alreadyExists: true };

    const { error: insErr } = await supabaseAdmin.from("applications").insert({
      user_id: user.id,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || null,
      college: data.college || null,
      city: data.city || null,
      department_applied: data.department_applied,
      portfolio_url: data.portfolio_url || null,
      github_url: data.github_url || null,
      linkedin_url: data.linkedin_url || null,
      resume_url: data.resume_url || null,
      skills: data.skills ?? [],
      bio: data.bio || null,
      experience: data.experience || null,
      availability: data.availability || null,
      agreed_terms: true,
      status: "pending",
    });
    if (insErr) return { ok: false, message: insErr.message };

    // Reflect the new application to every super admin via the in-app
    // notification bell (see NotificationsBell in workspace-shell.tsx), with
    // the full submitted details inline so admins don't have to click through
    // to see who applied and why.
    const { data: superAdmins } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");
    if (superAdmins?.length) {
      const lines = [
        `Email: ${data.email}`,
        data.phone && `Phone: ${data.phone}`,
        data.college && `College: ${data.college}`,
        data.city && `City: ${data.city}`,
        `Department: ${data.department_applied.replace(/_/g, " ")}`,
        data.skills?.length && `Skills: ${data.skills.join(", ")}`,
        data.experience && `Experience: ${data.experience}`,
        data.availability && `Availability: ${data.availability}`,
        data.bio && `Bio: ${data.bio}`,
        data.portfolio_url && `Portfolio: ${data.portfolio_url}`,
        data.github_url && `GitHub: ${data.github_url}`,
        data.linkedin_url && `LinkedIn: ${data.linkedin_url}`,
        data.resume_url && `Resume: ${data.resume_url}`,
      ].filter(Boolean);

      await supabaseAdmin.from("notifications").insert(
        superAdmins.map((row) => ({
          user_id: row.user_id,
          title: `New application: ${data.full_name}`,
          message: lines.join("\n"),
          type: "info",
          link: "/admin/applications",
        })),
      );
    }

    return { ok: true };
  });
