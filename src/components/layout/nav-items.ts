import {
  Activity,
  BookOpen,
  Hand,
  HelpCircle,
  Puzzle,
  Settings,
  Shield
} from "lucide-react";

// Work pages sit at the top of the sidebar (followed by the Student mode button). Help sits at the bottom
// above the profile menu, and Settings lives inside the profile menu.
export const mainNavItems = [
  { href: "/content", label: "Content", icon: BookOpen },
  { href: "/activities", label: "Activities", icon: Activity }
];

export const helpNavItem = { href: "/help", label: "Help", icon: HelpCircle };

export const settingsNavItem = { href: "/settings", label: "Settings", icon: Settings };

export const studentNavItems = [
  { href: "/playground", label: "Playground", icon: Puzzle },
  { href: "/gesture-practice", label: "Gestures", icon: Hand },
  { href: "/activities", label: "Activities", icon: Activity }
];

export const studentRouteHrefs = studentNavItems.map((item) => item.href);

export const adminNavItem = { href: "/admin", label: "Admin", icon: Shield };
