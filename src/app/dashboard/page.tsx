import { AppShell } from "@/components/layout/app-shell";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardView />
    </AppShell>
  );
}
