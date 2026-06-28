import { AppShell } from "@/components/layout/app-shell";
import { ActivitiesView } from "@/features/activities/activities-view";

export default function ActivitiesPage({
  searchParams
}: {
  searchParams?: { type?: string; activityId?: string };
}) {
  return (
    <AppShell>
      <ActivitiesView initialActivityType={searchParams?.type} initialActivityId={searchParams?.activityId} />
    </AppShell>
  );
}
