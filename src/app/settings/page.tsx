import { AppShell } from "@/components/layout/app-shell";
import { SettingsView } from "@/features/settings/settings-view";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}
