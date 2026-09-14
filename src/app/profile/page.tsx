import { AppShell } from "@/components/layout/app-shell";
import { ProfileView } from "@/features/profile/profile-view";

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileView />
    </AppShell>
  );
}
