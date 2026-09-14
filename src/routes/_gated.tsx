import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getGateStatus } from "@/lib/gate.functions";

export const Route = createFileRoute("/_gated")({
  beforeLoad: async () => {
    const status = await getGateStatus();
    if (!status.unlocked) throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
