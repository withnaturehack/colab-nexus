import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Applications closed · CoLab Nation" },
      { name: "description", content: "CoLab Nation applications are currently closed." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterClosed,
});

function RegisterClosed() {
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
              <div className="mx-auto mt-4 grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
                <Lock className="h-7 w-7" />
              </div>
              <CardTitle className="mt-3 font-display text-2xl">Applications closed</CardTitle>
              <CardDescription>
                CoLab Nation is currently not accepting new applications. Sign-in is limited to approved members only. Please check back later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/auth">
                <Button className="w-full shadow-glow">Sign in</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">Back to home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
