import { AppShell } from "@/components/layout/app-shell";
import { ContentLibraryView } from "@/features/content/content-library-view";

export default function ContentPage() {
  return (
    <AppShell>
      <ContentLibraryView />
    </AppShell>
  );
}
