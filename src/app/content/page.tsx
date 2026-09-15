import { AppShell } from "@/components/layout/app-shell";
import { ContentLibraryView } from "@/features/content/content-library-view";

export default function ContentPage({ searchParams }: { searchParams?: { item?: string } }) {
  return (
    <AppShell>
      <ContentLibraryView initialItemId={searchParams?.item} />
    </AppShell>
  );
}
