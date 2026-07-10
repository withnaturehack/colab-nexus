import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS, DEPT_LABEL } from "@/lib/workspace-schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, ClipboardList, Briefcase, Calendar, BookOpen, Megaphone, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
});

function count(table: string, filter?: (q: any) => any) {
  return async () => {
    let q: any = (supabase as any).from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };
}

function ReportsPage() {
  const stats = [
    { key: "members", label: "Active members", icon: Users, q: count("member_directory") },
    { key: "apps", label: "Applications", icon: FileText, q: count("applications") },
    { key: "pending", label: "Pending apps", icon: FileText, q: count("applications", (q) => q.eq("status", "pending")) },
    { key: "projects", label: "Projects", icon: Briefcase, q: count("projects") },
    { key: "tasks", label: "Tasks", icon: ClipboardList, q: count("tasks") },
    { key: "tasks_done", label: "Tasks done", icon: ClipboardList, q: count("tasks", (q) => q.eq("status", "done")) },
    { key: "ann", label: "Announcements", icon: Megaphone, q: count("announcements") },
    { key: "events", label: "Events", icon: Calendar, q: count("events") },
    { key: "kn", label: "Articles", icon: BookOpen, q: count("knowledge_articles") },
  ];

  const results = stats.map((s) => useQuery({ queryKey: ["report", s.key], queryFn: s.q }));

  const { data: byDept = [] } = useQuery({
    queryKey: ["report", "by-dept"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("member_directory").select("department");
      if (error) throw error;
      return (data ?? []) as { department: string | null }[];
    },
  });

  const deptCounts = DEPARTMENTS.map((d) => ({ ...d, count: byDept.filter((m) => m.department === d.value).length }));

  return (
    <WorkspaceShell title="Reports" subtitle="Live activity across the workspace.">
      <div className="space-y-6 animate-fade-in">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={s.key} className="surface-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                  <div>
                    <div className="text-2xl font-semibold font-display">{results[i].isLoading ? "…" : results[i].data ?? 0}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="surface-1">
          <CardHeader>
            <CardTitle className="text-base">Members by department</CardTitle>
            <CardDescription>Distribution across the five pillars.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deptCounts.map((d) => {
              const max = Math.max(1, ...deptCounts.map((x) => x.count));
              const pct = (d.count / max) * 100;
              return (
                <div key={d.value}>
                  <div className="flex justify-between text-xs mb-1"><span>{DEPT_LABEL[d.value]}</span><span className="text-muted-foreground">{d.count}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </WorkspaceShell>
  );
}
