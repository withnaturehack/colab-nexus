import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useMyProfile, useMyRoles, isAdmin, isDeptHead } from "@/lib/workspace-hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEPT_LABEL, STATUS_LABEL } from "@/lib/workspace-schema";
import { AlertCircle, ClipboardList, Users, Briefcase, Clock, Sparkles, Crown } from "lucide-react";
import { claimSuperAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile, isLoading } = useMyProfile();
  const { data: roles } = useMyRoles();

  const pending = profile?.status === "pending_approval";
  const rejected = profile?.status === "rejected";
  const admin = isAdmin(roles);
  const head = isDeptHead(roles);

  return (
    <WorkspaceShell
      title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
      subtitle="Here's what's happening in your workspace today."
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : pending ? (
        <PendingApprovalNotice />
      ) : rejected ? (
        <RejectedNotice />
      ) : (
        <div className="space-y-6 animate-fade-in">
          {/* Stat row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={ClipboardList} label="Today's tasks" value="0" hint="Nothing due today" />
            <StatCard icon={Clock} label="In progress" value="0" hint="Across your projects" />
            <StatCard icon={Briefcase} label="Projects" value="0" hint="You're a member of" />
            <StatCard icon={Users} label="Department" value={profile?.department ? DEPT_LABEL[profile.department] : "—"} hint="Your team" />
          </div>

          {/* Split panels */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2 surface-1">
              <CardHeader>
                <CardTitle className="font-display text-lg">Recent activity</CardTitle>
                <CardDescription>Task updates, mentions, and reviews land here.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Nothing yet. Task activity will appear here as your team starts collaborating.
                </div>
              </CardContent>
            </Card>

            <Card className="surface-1">
              <CardHeader>
                <CardTitle className="font-display text-lg">Announcements</CardTitle>
                <CardDescription>Latest from CoLab Nation.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No announcements yet.
                </div>
              </CardContent>
            </Card>
          </div>

          {(admin || head) && (
            <Card className="surface-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <CardTitle className="font-display text-lg">Admin quick actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Link to="/admin/applications">
                  <Button>Review applications</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </WorkspaceShell>
  );
}

function PendingApprovalNotice() {
  return (
    <Card className="glass max-w-2xl mx-auto animate-scale-in shadow-elegant">
      <CardHeader className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-warning/20 text-warning">
          <Clock className="h-7 w-7" />
        </div>
        <CardTitle className="mt-4 font-display text-2xl">Awaiting approval</CardTitle>
        <CardDescription>
          Your application is with the CoLab Nation team. You'll get an email as soon as an admin reviews it and grants workspace access.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center gap-2">
        <Badge variant="secondary">{STATUS_LABEL.pending}</Badge>
      </CardContent>
    </Card>
  );
}

function RejectedNotice() {
  return (
    <Card className="glass max-w-2xl mx-auto animate-scale-in shadow-elegant">
      <CardHeader className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/20 text-destructive">
          <AlertCircle className="h-7 w-7" />
        </div>
        <CardTitle className="mt-4 font-display text-2xl">Application not accepted</CardTitle>
        <CardDescription>
          Unfortunately your application wasn't accepted at this time. Please reach out to a team lead if you'd like to discuss.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string }) {
  return (
    <Card className="surface-1">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

