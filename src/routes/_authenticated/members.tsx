import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { supabase } from "@/integrations/supabase/client";
import { DEPT_LABEL, type Department } from "@/lib/workspace-schema";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/members")({
  component: MembersPage,
});

type Member = { id: string; full_name: string | null; department: Department | null; avatar_url: string | null; status: string };

function MembersPage() {
  const [q, setQ] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-directory"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("member_directory").select("*").order("full_name");
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const filtered = members.filter((m) => !q || (m.full_name ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <WorkspaceShell title="Members" subtitle={`${members.length} active members across the workspace.`}>
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search members" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {filtered.map((m) => {
            const initials = (m.full_name ?? "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
            return (
              <Card key={m.id} className="surface-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-border">
                    {m.avatar_url && <img src={m.avatar_url} alt="" />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{m.full_name ?? "Member"}</div>
                    <div className="text-xs text-muted-foreground">{m.department ? DEPT_LABEL[m.department] : "Unassigned"}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{m.status}</Badge>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <div className="col-span-full text-sm text-muted-foreground text-center py-10">No members found.</div>}
        </div>
      )}
    </WorkspaceShell>
  );
}
