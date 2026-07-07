import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";

export const Route = createFileRoute("/_authenticated/departments")({
  component: () => <ComingSoon title="Departments" description="Module coming in the next phase." />,
});
