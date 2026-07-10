import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceShell } from "@/components/workspace-shell";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/workspace-hooks";
import { DEPARTMENTS, DEPT_LABEL, type Department } from "@/lib/workspace-schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar as CalIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

type EventRow = { id: string; title: string; description: string | null; location: string | null; starts_at: string; ends_at: string | null; department: Department | null; created_by: string };

function CalendarPage() {
  const qc = useQueryClient();
  const { data: user } = useSession();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("events").select("*").gte("starts_at", new Date(Date.now() - 24*60*60*1000).toISOString()).order("starts_at");
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("ev-live").on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => qc.invalidateQueries({ queryKey: ["events"] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const del = async (id: string) => {
    const { error } = await (supabase as any).from("events").delete().eq("id", id);
    if (error) toast.error(error.message); else toast.success("Event removed");
  };

  const groups = events.reduce<Record<string, EventRow[]>>((acc, e) => {
    const key = format(new Date(e.starts_at), "EEEE, MMM d");
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <WorkspaceShell title="Calendar" subtitle="Upcoming meetings, sessions, and deadlines." actions={<NewEventDialog userId={user?.id} />}>
      {isLoading ? <div className="text-sm text-muted-foreground">Loading…</div> : events.length === 0 ? (
        <Card className="surface-1"><CardContent className="p-10 text-center text-sm text-muted-foreground">No upcoming events. Add one.</CardContent></Card>
      ) : (
        <div className="space-y-6 animate-fade-in">
          {Object.entries(groups).map(([day, list]) => (
            <div key={day}>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{day}</div>
              <div className="space-y-2">
                {list.map((e) => (
                  <Card key={e.id} className="surface-1">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><CalIcon className="h-4 w-4" /></div>
                          <div>
                            <CardTitle className="text-base">{e.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{format(new Date(e.starts_at), "p")}{e.ends_at ? ` – ${format(new Date(e.ends_at), "p")}` : ""}</span>
                              {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                              {e.department && <Badge variant="outline" className="text-[10px]">{DEPT_LABEL[e.department]}</Badge>}
                            </div>
                          </div>
                        </div>
                        {e.created_by === user?.id && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => del(e.id)}><Trash2 className="h-3 w-3" /></Button>}
                      </div>
                    </CardHeader>
                    {e.description && <CardContent className="text-sm text-muted-foreground">{e.description}</CardContent>}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}

function NewEventDialog({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [department, setDepartment] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("events").insert({
      title, description: description || null, location: location || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      department: department || null, created_by: userId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Event created");
    setOpen(false); setTitle(""); setDescription(""); setLocation(""); setStartsAt(""); setEndsAt(""); setDepartment("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />New event</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create event</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Title</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zoom / Room 302 / etc" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Starts</Label><Input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div><Label>Ends</Label><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
          </div>
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
