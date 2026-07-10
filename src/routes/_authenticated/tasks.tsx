import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/workspace-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_by: string;
  assignee_id: string | null;
  created_at: string;
};

const STATUSES = ["todo", "in_progress", "done"] as const;
const STATUS_LABEL: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };

function TasksPage() {
  const qc = useQueryClient();
  const { data: user } = useSession();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("tasks-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        qc.invalidateQueries({ queryKey: ["tasks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("tasks").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else toast.success("Task updated");
  };

  const del = async (id: string) => {
    const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Task deleted");
  };

  return (
    <WorkspaceShell title="Tasks" subtitle="Track what needs to get done across the team." actions={<NewTaskDialog userId={user?.id} />}>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3 animate-fade-in">
          {STATUSES.map((s) => {
            const items = tasks.filter((t) => t.status === s);
            const Icon = s === "done" ? CheckCircle2 : s === "in_progress" ? Clock : Circle;
            return (
              <Card key={s} className="surface-1">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-primary" />
                    {STATUS_LABEL[s]}
                    <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No tasks</p>}
                  {items.map((t) => (
                    <div key={t.id} className="rounded-lg border border-border p-3 bg-card/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm">{t.title}</div>
                          {t.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</div>}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={t.priority === "high" ? "destructive" : "outline"} className="text-[10px]">{t.priority}</Badge>
                            {t.due_date && <span className="text-[10px] text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        {t.created_by === user?.id && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => del(t.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Select value={t.status} onValueChange={(v) => setStatus(t.id, v)}>
                        <SelectTrigger className="mt-2 h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((x) => <SelectItem key={x} value={x}>{STATUS_LABEL[x]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}

function NewTaskDialog({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("tasks").insert({
      title, description: description || null, priority,
      due_date: dueDate || null, created_by: userId, status: "todo",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Task created");
    setOpen(false); setTitle(""); setDescription(""); setDueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" />New task</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create task</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
