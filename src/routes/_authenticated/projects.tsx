import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/projects")({
  component: () => <ComingSoon title="Projects" description="Module coming in the next phase." />,
});
