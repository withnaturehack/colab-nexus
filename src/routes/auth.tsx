import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { seedSuperAdmin } from "@/lib/bootstrap.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowLeft, Crown } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · CoLab Nation Workspace" },
      { name: "description", content: "Sign in to the CoLab Nation internal workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const seedFn = useServerFn(seedSuperAdmin);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedFn({});
      if (!res.ok) toast.error(res.message ?? "Seed failed");
      else {
        toast.success("Super admin ready: colabnation@gmail.in / ColabNation@12345");
        setEmail("colabnation@gmail.in");
        setPassword("ColabNation@12345");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Seed failed");
    }
    setSeeding(false);
  };


  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("[v0] Starting sign-in with:", email);
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setLoading(false);
      console.log("[v0] Sign-in error:", error.message);
      if (/confirm|verify/i.test(error.message)) {
        toast.error("Please verify your email first");
        navigate({ to: "/verify-email", search: { email } });
        return;
      }
      toast.error(error.message);
      return;
    }
    
    console.log("[v0] Sign-in successful, session:", data.session?.access_token ? "exists" : "missing");
    
    // Wait a bit for session to be stored and then verify
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setLoading(false);
      console.log("[v0] Session verification failed");
      toast.error("Session verification failed, please try again");
      return;
    }
    
    setLoading(false);
    console.log("[v0] Session verified, navigating to dashboard");
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const handleGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (res.error) {
      toast.error(res.error.message ?? "Google sign-in failed");
      return;
    }
    if (!res.redirected) navigate({ to: "/dashboard" });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
    setMode("signin");
  };

  return (
    <div className="relative min-h-screen hero-bg overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "var(--gradient-glow)" }} />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-scale-in">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Card className="glass shadow-elegant">
            <CardHeader className="text-center">
              <div className="mx-auto flex justify-center">
                <BrandLogo size={56} />
              </div>
              <CardTitle className="mt-4 font-display text-2xl">
                {mode === "signin" ? "Welcome back" : "Reset your password"}
              </CardTitle>
              <CardDescription>
                {mode === "signin" ? "Sign in to your CoLab Nation workspace" : "We'll email you a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === "signin" ? (
                <Tabs defaultValue="password" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="password">Password</TabsTrigger>
                    <TabsTrigger value="google">Google</TabsTrigger>
                  </TabsList>
                  <TabsContent value="password" className="mt-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" placeholder="you@colabnation.org" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="password">Password</Label>
                          <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary hover:underline">
                            Forgot?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" placeholder="••••••••" />
                        </div>
                      </div>
                      <Button type="submit" className="w-full shadow-glow" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign in
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="google" className="mt-4 space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Sign in with your Google account. You'll need admin approval before accessing the workspace.
                    </p>
                    <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
                      Continue with Google
                    </Button>
                  </TabsContent>
                </Tabs>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="femail">Email</Label>
                    <Input id="femail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@colabnation.org" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send reset link
                  </Button>
                  <button type="button" onClick={() => setMode("signin")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
                    Back to sign in
                  </button>
                </form>
              )}

              <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="text-primary hover:underline">
                  Apply to join
                </Link>
              </div>
              {typeof window !== "undefined" && new URLSearchParams(window.location.search).has("bootstrap") && (
                <Button variant="ghost" size="sm" onClick={handleSeed} disabled={seeding} className="mt-2 w-full text-xs text-muted-foreground">
                  {seeding ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Crown className="mr-2 h-3 w-3" />}
                  Bootstrap super admin
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
