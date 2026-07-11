import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    console.log("[v0] Checking auth in _authenticated guard");
    
    // Try to get user with retries in case session is still being persisted
    let user = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!user && attempts < maxAttempts) {
      const { data, error } = await supabase.auth.getUser();
      console.log(`[v0] Auth check attempt ${attempts + 1}: ${data.user ? "authenticated" : "not authenticated"}`);
      
      if (error || !data.user) {
        attempts++;
        if (attempts < maxAttempts) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        user = data.user;
        break;
      }
    }
    
    if (!user) {
      console.log("[v0] Auth guard failed, redirecting to /auth");
      throw redirect({ to: "/auth" });
    }
    
    console.log("[v0] Auth guard passed for user:", user.id);
    return { user };
  },
  component: () => <Outlet />,
});
