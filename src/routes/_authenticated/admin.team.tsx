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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Shield, ShieldOff, Search, Crown } from "lucide-react";
import { useMyRoles, isAdmin } from "@/lib/workspace-hooks";
import { APP_ROLES, ROLE_LABEL, type AppRole } from "@/lib/workspace-schema";
import { grantRole, revokeRole, createUserAccount } from "@/lib/team.functions";
import { DEPARTMENTS, type Department } from "@/lib/workspace-schema";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/team")({
  component: TeamPage,
});

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  status: string;
};

type UserRole = { user_id: string; role: AppRole };

function TeamPage() {
  const { data: myRoles } = useMyRoles();
  const admin = isAdmin(myRoles);
  const [q, setQ] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["team", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, full_name, department, status").order("full_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["team", "roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return data as UserRole[];
    },
  });

  if (!admin) {
    return (
      <WorkspaceShell title="Team & Roles">
        <Card><CardContent className="p-8 text-center text-muted-foreground">Only Super Admins can manage roles.</CardContent></Card>
      </WorkspaceShell>
    );
  }

  const rolesByUser = new Map<string, AppRole[]>();
  (userRoles ?? []).forEach((r) => {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  });

  const heads = (profiles ?? []).filter((p) =>
    (rolesByUser.get(p.id) ?? []).some((r) => r === "super_admin" || r.endsWith("_head")),
  );
  const filtered = (profiles ?? []).filter((p) =>
    !q || `${p.full_name ?? ""} ${p.email}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <WorkspaceShell title="Team & Roles" subtitle="Promote heads, manage super admins, and see who holds what.">
      <div className="space-y-6 animate-fade-in">
        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display"><Crown className="h-5 w-5 text-primary" /> Current leadership</CardTitle>
          </CardHeader>
          <CardContent>
            {heads.length === 0 ? (
              <div className="text-sm text-muted-foreground">No heads or super admins assigned yet.</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {heads.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.full_name ?? p.email}</div>
                      <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(rolesByUser.get(p.id) ?? []).map((r) => (
                        <Badge key={r} variant={r === "super_admin" ? "default" : "secondary"} className="text-[10px]">
                          {ROLE_LABEL[r]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <CreateAccountCard />



        <Card className="surface-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">All members</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((p) => (
              <MemberRow key={p.id} profile={p} roles={rolesByUser.get(p.id) ?? []} />
            ))}
          </CardContent>
        </Card>
      </div>
    </WorkspaceShell>
  );
}

function MemberRow({ profile, roles }: { profile: Profile; roles: AppRole[] }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<AppRole>("member");
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["team"] });

  const grantMut = useMutation({
    mutationFn: () => grant({ data: { userId: profile.id, role } }),
    onSuccess: () => { toast.success(`Granted ${ROLE_LABEL[role]}`); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const revokeMut = useMutation({
    mutationFn: (r: AppRole) => revoke({ data: { userId: profile.id, role: r } }),
    onSuccess: () => { toast.success("Role removed"); invalidate(); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{profile.full_name ?? profile.email}</div>
        <div className="text-xs text-muted-foreground truncate">{profile.email} · {profile.status}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {roles.length === 0 ? (
            <span className="text-[10px] text-muted-foreground">No roles</span>
          ) : (
            roles.map((r) => (
              <Badge key={r} variant="outline" className="gap-1 text-[10px]">
                {ROLE_LABEL[r]}
                <button onClick={() => revokeMut.mutate(r)} className="text-destructive hover:text-destructive/70">×</button>
              </Badge>
            ))
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {APP_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => grantMut.mutate()} disabled={grantMut.isPending}>
          {grantMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
          <span className="ml-1">Grant</span>
        </Button>
      </div>
    </div>
  );
}

function CreateAccountCard() {
  const qc = useQueryClient();
  const create = useServerFn(createUserAccount);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("member");
  const [dept, setDept] = useState<Department | "">("");

  const mut = useMutation({
    mutationFn: () =>
      create({
        data: {
          email,
          password,
          full_name: fullName,
          role,
          department: dept || undefined,
        },
      }),
    onSuccess: () => {
      toast.success(`Account created for ${email}`);
      setEmail(""); setPassword(""); setFullName(""); setRole("member"); setDept("");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const canSubmit = email.trim() && password.length >= 8 && fullName.trim().length >= 2;

  return (
    <Card className="surface-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display">
          <UserPlus className="h-5 w-5 text-primary" /> Create account
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            {APP_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dept || "__none"} onValueChange={(v) => setDept(v === "__none" ? "" : (v as Department))}>
          <SelectTrigger><SelectValue placeholder="Department (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">No department</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="sm:col-span-2 flex justify-end">
          <Button onClick={() => mut.mutate()} disabled={!canSubmit || mut.isPending}>
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Create account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


// Prevent unused import warnings
void ShieldOff;
