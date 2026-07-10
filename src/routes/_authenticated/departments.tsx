import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS, DEPT_LABEL, DEPT_ROLE, ROLE_LABEL, type Department } from "@/lib/workspace-schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/departments")({
  component: DepartmentsPage,
});

function DepartmentsPage() {
  const { data: profiles = [] } = useQuery({
    queryKey: ["dept-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("member_directory").select("department");
      if (error) throw error;
      return (data ?? []) as { department: Department | null }[];
    },
  });

  const { data: heads = [] } = useQuery({
    queryKey: ["dept-heads"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data ?? []) as { user_id: string; role: string }[];
    },
  });

  const counts = DEPARTMENTS.reduce<Record<string, number>>((acc, d) => {
    acc[d.value] = profiles.filter((p) => p.department === d.value).length;
    return acc;
  }, {});

  return (
    <WorkspaceShell title="Departments" subtitle="The five pillars of CoLab Nation.">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
        {DEPARTMENTS.map((d) => {
          const headRole = DEPT_ROLE[d.value];
          const hasHead = heads.some((h) => h.role === headRole);
          return (
            <Card key={d.value} className="surface-1">
              <CardHeader>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></div>
                <CardTitle className="mt-2">{d.label}</CardTitle>
                <CardDescription>{ROLE_LABEL[headRole]}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />{counts[d.value] ?? 0} members
                </div>
                <Badge variant={hasHead ? "default" : "outline"}>{hasHead ? "Head assigned" : "Vacant"}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </WorkspaceShell>
  );
}
