import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Gate: only approved (active) members OR super admins may enter
    const uid = data.user.id;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("status").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);

    const isSuperAdmin = (roles ?? []).some((r) => r.role === "super_admin");
    const isActive = profile?.status === "active";

    if (!isSuperAdmin && !isActive) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { pending: "1" } as never });
    }

    return { user: data.user };
  },
  component: () => <Outlet />,
});
