import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/knowledge")({
  component: () => <ComingSoon title="Knowledge" description="Module coming in the next phase." />,
});
