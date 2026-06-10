import { AppShell } from "@/components/layout/app-shell";
import { AdminPanelView } from "@/features/admin/admin-panel-view";

export default function AdminPage() {
  return (
    <AppShell>
      <AdminPanelView />
    </AppShell>
  );
}
