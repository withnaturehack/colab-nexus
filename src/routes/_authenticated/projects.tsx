import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/workspace-hooks";
import { DEPARTMENTS, DEPT_LABEL, type Department } from "@/lib/workspace-schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects")({
  component: ProjectsPage,
});

type Project = { id: string; name: string; description: string | null; department: Department | null; status: string; owner_id: string; created_at: string };

function ProjectsPage() {
  const qc = useQueryClient();
  const { data: user } = useSession();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("projects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("projects-live").on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => qc.invalidateQueries({ queryKey: ["projects"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const del = async (id: string) => {
    const { error } = await (supabase as any).from("projects").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Project deleted");
  };

  return (
    <WorkspaceShell title="Projects" subtitle="All initiatives running across CoLab Nation." actions={<NewProjectDialog userId={user?.id} />}>
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : projects.length === 0 ? (
        <Card className="surface-1"><CardContent className="p-10 text-center text-sm text-muted-foreground">No projects yet. Create the first one.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {projects.map((p) => (
            <Card key={p.id} className="surface-1">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Briefcase className="h-5 w-5" /></div>
                  {p.owner_id === user?.id && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(p.id)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
                <CardTitle className="text-base mt-2">{p.name}</CardTitle>
                {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {p.department && <Badge variant="outline">{DEPT_LABEL[p.department]}</Badge>}
                <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

function NewProjectDialog({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("projects").insert({
      name, description: description || null, department: department || null, owner_id: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setOpen(false); setName(""); setDescription(""); setDepartment("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New project</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create project</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
