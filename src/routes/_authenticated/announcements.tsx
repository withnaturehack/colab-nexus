import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession, useMyRoles, isAdmin, isDeptHead } from "@/lib/workspace-hooks";
import { DEPARTMENTS, DEPT_LABEL, type Department } from "@/lib/workspace-schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Megaphone, Pin } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/announcements")({
  component: AnnouncementsPage,
});

type Announcement = { id: string; title: string; body: string; department: Department | null; author_id: string; pinned: boolean; created_at: string };

function AnnouncementsPage() {
  const qc = useQueryClient();
  const { data: user } = useSession();
  const { data: roles } = useMyRoles();
  const canPost = isAdmin(roles) || isDeptHead(roles);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("ann-live").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => qc.invalidateQueries({ queryKey: ["announcements"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const del = async (id: string) => {
    const { error } = await (supabase as any).from("announcements").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Deleted");
  };

  return (
    <WorkspaceShell title="Announcements" subtitle="Broadcasts from department heads and leadership." actions={canPost ? <NewAnnouncementDialog userId={user?.id} /> : null}>
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : items.length === 0 ? (
        <Card className="surface-1"><CardContent className="p-10 text-center text-sm text-muted-foreground">No announcements yet.</CardContent></Card>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {items.map((a) => (
            <Card key={a.id} className="surface-1">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Megaphone className="h-4 w-4" /></div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">{a.title}{a.pinned && <Pin className="h-3 w-3 text-primary" />}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(a.created_at))} ago</span>
                        {a.department && <Badge variant="outline" className="text-[10px]">{DEPT_LABEL[a.department]}</Badge>}
                      </div>
                    </div>
                  </div>
                  {a.author_id === user?.id && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(a.id)}><Trash2 className="h-3 w-3" /></Button>}
                </div>
              </CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{a.body}</p></CardContent>
            </Card>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

function NewAnnouncementDialog({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [pinned, setPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("announcements").insert({
      title, body, department: department || null, author_id: userId, pinned,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Announcement posted");
    setOpen(false); setTitle(""); setBody(""); setDepartment(""); setPinned(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Post</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Post announcement</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Message</Label><Textarea required rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></div>
          <div><Label>Department (optional)</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />Pin to top</label>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Posting…" : "Post"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
