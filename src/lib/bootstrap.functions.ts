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
  .inputValidator((raw: unknown) => resendInput.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resend({
      type: "signup",
      email: data.email,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  });
