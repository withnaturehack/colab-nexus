import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, LayoutDashboard, ShieldCheck, Users, Sparkles } from "lucide-react";
import { BrandLogo, brandLogoUrl } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen hero-bg">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-xl sticky top-0 z-40 bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/">
            <BrandLogo size={36} withWordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="shadow-glow">
                Apply <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-20 text-center">
        <div
          className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-[420px] max-w-3xl opacity-40 blur-3xl"
          style={{ background: "var(--gradient-glow)" }}
        />
        <div className="relative">
          <div className="mx-auto mb-8 flex justify-center animate-scale-in">
            <img
              src={brandLogoUrl}
              alt="CoLab Nation"
              className="h-28 w-28 rounded-2xl shadow-glow ring-1 ring-white/10 object-cover"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs text-muted-foreground animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Powering Ideas into Reality · Members only
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl animate-fade-in">
            One workspace to run
            <br />
            <span className="gradient-text">the entire organization.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in">
            Recruitment, onboarding, tasks, projects, departments, meetings, and reports —
            every layer of CoLab Nation, unified.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in">
          <Link to="/register">
            <Button size="lg" className="shadow-glow">
              Apply to join
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline">
              Member sign in
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          New signups are reviewed by an admin before workspace access is granted.
        </p>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="surface-1 rounded-2xl p-6 transition hover:-translate-y-1">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © CoLab Nation · Internal workspace
      </footer>
    </div>
  );
}

const features = [
  { icon: Users, title: "Recruitment", desc: "Applicant pipeline, interviews, and department-scoped approvals." },
  { icon: LayoutDashboard, title: "Tasks & Projects", desc: "Kanban, timeline, and calendar views across every team." },
  { icon: Building2, title: "Departments", desc: "Technical, Content, Marketing, PR, Events — each with its own dashboard." },
  { icon: ShieldCheck, title: "Role-based access", desc: "Super Admin, Heads, and Members with secure, scoped permissions." },
];
