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
import { Plus, Trash2, BookOpen, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/knowledge")({
  component: KnowledgePage,
});

type Article = { id: string; title: string; content: string; tags: string[] | null; department: Department | null; author_id: string; created_at: string };

function KnowledgePage() {
  const qc = useQueryClient();
  const { data: user } = useSession();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Article | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["knowledge"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("knowledge_articles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Article[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("kn-live").on("postgres_changes", { event: "*", schema: "public", table: "knowledge_articles" }, () => qc.invalidateQueries({ queryKey: ["knowledge"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const del = async (id: string) => {
    const { error } = await (supabase as any).from("knowledge_articles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); setOpen(null); }
  };

  const filtered = items.filter((a) => !q || a.title.toLowerCase().includes(q.toLowerCase()) || a.content.toLowerCase().includes(q.toLowerCase()));

  return (
    <WorkspaceShell title="Knowledge Hub" subtitle="Playbooks, docs, and how-tos from every team." actions={<NewArticleDialog userId={user?.id} />}>
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search articles" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : filtered.length === 0 ? (
        <Card className="surface-1"><CardContent className="p-10 text-center text-sm text-muted-foreground">No articles yet. Write the first one.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {filtered.map((a) => (
            <Card key={a.id} className="surface-1 cursor-pointer hover:border-primary/50 transition" onClick={() => setOpen(a)}>
              <CardHeader>
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></div>
                <CardTitle className="text-base mt-2">{a.title}</CardTitle>
                <CardDescription className="line-clamp-2">{a.content}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1">
                {a.department && <Badge variant="outline">{DEPT_LABEL[a.department]}</Badge>}
                {(a.tags ?? []).slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader><DialogTitle>{open.title}</DialogTitle></DialogHeader>
              <div className="flex flex-wrap gap-1 mb-3">
                {open.department && <Badge variant="outline">{DEPT_LABEL[open.department]}</Badge>}
                {(open.tags ?? []).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
              <div className="text-sm whitespace-pre-wrap">{open.content}</div>
              {open.author_id === user?.id && (
                <DialogFooter><Button variant="destructive" size="sm" onClick={() => del(open.id)}><Trash2 className="h-3 w-3 mr-1" />Delete</Button></DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}

function NewArticleDialog({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const tagArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await (supabase as any).from("knowledge_articles").insert({
      title, content, tags: tagArr, department: department || null, author_id: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Article published");
    setOpen(false); setTitle(""); setContent(""); setTags(""); setDepartment("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New article</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Write article</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Content</Label><Textarea required rows={8} value={content} onChange={(e) => setContent(e.target.value)} /></div>
          <div><Label>Tags (comma separated)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="onboarding, playbook" /></div>
          <div><Label>Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter><Button type="submit" disabled={saving}>{saving ? "Publishing…" : "Publish"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
