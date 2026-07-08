import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { resendVerificationEmail } from "@/lib/bootstrap.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MailCheck, RefreshCw, ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({ email: (s.email as string) ?? "" }),
  head: () => ({
    meta: [
      { title: "Verify your email · CoLab Nation" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState(search.email ?? "");
  const [sending, setSending] = useState(false);
  const resendFn = useServerFn(resendVerificationEmail);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.email_confirmed_at) {
        toast.success("Email verified — welcome!");
        navigate({ to: "/dashboard" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const resend = async () => {
    if (!email) return toast.error("Enter your email first");
    setSending(true);
    try {
      const res = await resendFn({ data: { email } });
      if (!res.ok) toast.error(res.message ?? "Could not resend");
      else toast.success("Verification email sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
    setSending(false);
  };

  return (
    <div className="relative min-h-screen hero-bg overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: "var(--gradient-glow)" }} />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md animate-scale-in">
          <Link to="/auth" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <Card className="glass shadow-elegant">
            <CardHeader className="text-center">
              <div className="mx-auto flex justify-center"><BrandLogo size={56} /></div>
              <div className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <MailCheck className="h-7 w-7" />
              </div>
              <CardTitle className="mt-3 font-display text-2xl">Verify your email</CardTitle>
              <CardDescription>
                We sent a verification link to your inbox. Click it to activate your account, then return here to sign in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vemail">Email</Label>
                <Input id="vemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
              <Button onClick={resend} disabled={sending} className="w-full shadow-glow">
                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Resend verification email
              </Button>
              <div className="text-center text-xs text-muted-foreground">
                Didn't get it? Check spam, or try resending. After verifying, admins still need to approve your application.
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>
                I've verified — sign in
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
