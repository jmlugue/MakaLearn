import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ActivitiesView } from "@/features/activities/activities-view";

// The view reads `?play=` and friends itself, so moving between the library and the player stays client-side.
export default function ActivitiesPage() {
  return (
    <AppShell>
      <Suspense>
        <ActivitiesView />
      </Suspense>
    </AppShell>
  );
}
