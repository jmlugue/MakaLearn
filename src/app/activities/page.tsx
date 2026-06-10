import { AppShell } from "@/components/layout/app-shell";
import { ActivitiesView } from "@/features/activities/activities-view";

export default function ActivitiesPage() {
  return (
    <AppShell>
      <ActivitiesView />
    </AppShell>
  );
}
