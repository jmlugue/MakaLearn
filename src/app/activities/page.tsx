import { AppShell } from "@/components/layout/app-shell";
import { ActivitiesView } from "@/features/activities/activities-view";

export default function ActivitiesPage({
  searchParams
}: {
  searchParams?: { type?: string };
}) {
  return (
    <AppShell>
      <ActivitiesView initialActivityType={searchParams?.type} />
    </AppShell>
  );
}
