import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Search, ExternalLink, Loader2 } from "lucide-react";
import { DEPARTMENTS, DEPT_LABEL, ROLE_LABEL, STATUS_LABEL, type ApplicationStatus, DEPT_ROLE } from "@/lib/workspace-schema";
import { useMyRoles, isAdmin, isDeptHead } from "@/lib/workspace-hooks";
import { approveApplication, rejectApplication, updateApplicationStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: ApplicationsPage,
});

type Application = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  college: string | null;
  city: string | null;
  department_applied: "technical" | "content_design" | "marketing" | "pr" | "events";
  portfolio_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  skills: string[] | null;
  bio: string | null;
  experience: string | null;
  availability: string | null;
  status: ApplicationStatus;
  internal_notes: string | null;
  created_at: string;
};

function ApplicationsPage() {
  const { data: roles } = useMyRoles();
  const admin = isAdmin(roles);
  const head = isDeptHead(roles);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<ApplicationStatus | "all">("pending");

  const { data: apps, isLoading } = useQuery({
    queryKey: ["applications", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Application[];
    },
  });

  if (!admin && !head) {
    return (
      <WorkspaceShell title="Applications">
        <Card><CardContent className="p-8 text-center text-muted-foreground">You don't have access to this page.</CardContent></Card>
      </WorkspaceShell>
    );
  }

  const filtered = (apps ?? []).filter((a) => {
    const matchTab = tab === "all" ? true : a.status === tab;
    const matchQ = !q || `${a.full_name} ${a.email} ${a.college ?? ""}`.toLowerCase().includes(q.toLowerCase());
    return matchTab && matchQ;
  });

  const counts: Record<string, number> = {};
  (apps ?? []).forEach((a) => (counts[a.status] = (counts[a.status] ?? 0) + 1));

  return (
    <WorkspaceShell title="Applications" subtitle="Review pending applicants and grant workspace access.">
      <div className="space-y-4 animate-fade-in">
        <Card className="surface-1">
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, college…" className="pl-9" />
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All ({apps?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending ?? 0})</TabsTrigger>
            <TabsTrigger value="under_review">Review ({counts.under_review ?? 0})</TabsTrigger>
            <TabsTrigger value="interview">Interview ({counts.interview ?? 0})</TabsTrigger>
            <TabsTrigger value="assignment">Assignment ({counts.assignment ?? 0})</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({counts.accepted ?? 0})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected ?? 0})</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground p-8 text-center">Loading applications…</div>
            ) : filtered.length === 0 ? (
              <Card className="surface-1"><CardContent className="p-10 text-center text-muted-foreground">No applications here.</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map((app) => (
                  <ApplicationCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </WorkspaceShell>
  );
}

function ApplicationCard({ app }: { app: Application }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [role, setRole] = useState<string>(DEPT_ROLE[app.department_applied]);
  const [department, setDepartment] = useState(app.department_applied);
  const [note, setNote] = useState("");

  const approveFn = useServerFn(approveApplication);
  const rejectFn = useServerFn(rejectApplication);
  const statusFn = useServerFn(updateApplicationStatus);

  const approveMut = useMutation({
    mutationFn: () => approveFn({ data: { applicationId: app.id, department: department, role: role as never } }),
    onSuccess: () => {
      toast.success("Applicant approved");
      qc.invalidateQueries({ queryKey: ["applications"] });
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectFn({ data: { applicationId: app.id, note } }),
    onSuccess: () => {
      toast.success("Application rejected");
      qc.invalidateQueries({ queryKey: ["applications"] });
      setRejectOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const setStatus = async (s: ApplicationStatus) => {
    try {
      await statusFn({ data: { applicationId: app.id, status: s } });
      toast.success(`Moved to ${STATUS_LABEL[s]}`);
      qc.invalidateQueries({ queryKey: ["applications"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <Card className="surface-1 transition hover:border-primary/30">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg font-semibold truncate">{app.full_name}</h3>
              <Badge variant="secondary">{DEPT_LABEL[app.department_applied]}</Badge>
              <StatusBadge status={app.status} />
            </div>
            <div className="mt-1 text-sm text-muted-foreground truncate">
              {app.email}{app.college ? ` · ${app.college}` : ""}{app.city ? ` · ${app.city}` : ""}
            </div>
            {app.bio && <p className="mt-2 text-sm line-clamp-2">{app.bio}</p>}
            {app.skills && app.skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {app.skills.slice(0, 8).map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {app.portfolio_url && <ExtLink href={app.portfolio_url} label="Portfolio" />}
              {app.github_url && <ExtLink href={app.github_url} label="GitHub" />}
              {app.linkedin_url && <ExtLink href={app.linkedin_url} label="LinkedIn" />}
              {app.resume_url && <ExtLink href={app.resume_url} label="Resume" />}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {app.status === "pending" && (
              <Button size="sm" variant="outline" onClick={() => setStatus("under_review")}>Mark under review</Button>
            )}
            {app.status !== "accepted" && app.status !== "rejected" && (
              <>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="shadow-glow"><CheckCircle2 className="mr-1 h-4 w-4" /> Approve</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approve {app.full_name}</DialogTitle>
                      <DialogDescription>Assign a department and role to activate this member's workspace.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                      <div>
                        <label className="text-xs uppercase tracking-widest text-muted-foreground">Department</label>
                        <Select value={department} onValueChange={(v) => { setDepartment(v as typeof department); setRole(DEPT_ROLE[v as typeof department]); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-widest text-muted-foreground">Role</label>
                        <Select value={role} onValueChange={setRole}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">{ROLE_LABEL.member}</SelectItem>
                            <SelectItem value={DEPT_ROLE[department]}>{ROLE_LABEL[DEPT_ROLE[department]]}</SelectItem>
                            <SelectItem value="super_admin">{ROLE_LABEL.super_admin}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                      <Button onClick={() => approveMut.mutate()} disabled={approveMut.isPending} className="shadow-glow">
                        {approveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approve & activate
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><XCircle className="mr-1 h-4 w-4" /> Reject</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject {app.full_name}?</DialogTitle>
                      <DialogDescription>Optional note for the internal record.</DialogDescription>
                    </DialogHeader>
                    <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (internal)…" />
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
                        {rejectMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reject
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExtLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    under_review: "outline",
    interview: "outline",
    assignment: "outline",
    accepted: "default",
    rejected: "destructive",
    onboarded: "default",
  };
  return <Badge variant={map[status]}>{STATUS_LABEL[status]}</Badge>;
}
