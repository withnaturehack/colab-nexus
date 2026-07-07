import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <WorkspaceShell title={title} subtitle={description}>
      <Card className="surface-1 max-w-2xl mx-auto animate-fade-in">
        <CardContent className="p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-xl font-semibold">Coming up next</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This module is scaffolded and ships in the next phase of the CoLab Nation workspace build.
          </p>
        </CardContent>
      </Card>
    </WorkspaceShell>
  );
}

export const routes = {
  tasks: createFileRoute("/_authenticated/tasks")({ component: () => <ComingSoon title="Tasks" description="Kanban, timeline, and calendar views." /> }),
};

// Individual route files below re-export their own Route.
export { ComingSoon };
