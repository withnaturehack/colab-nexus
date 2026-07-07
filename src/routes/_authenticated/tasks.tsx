import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: () => <ComingSoon title="Tasks" description="Module coming in the next phase." />,
});
