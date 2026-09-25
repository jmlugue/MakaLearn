import {
  BookOpen,
  Hand,
  HelpCircle,
  Puzzle,
  Settings,
  Shapes,
  Shield
} from "lucide-react";

// Work pages sit at the top of the sidebar (followed by the Student mode button). Help sits at the bottom
// above the profile menu, and Settings lives inside the profile menu.
// `tip` is the Guide mode key; the text itself lives in `src/features/guide/guide-content.ts`.
export const mainNavItems = [
  { href: "/content", label: "Content", icon: BookOpen, tip: "nav.content" },
  { href: "/activities", label: "Activities", icon: Shapes, tip: "nav.activities" }
];

export const helpNavItem = { href: "/help", label: "Help", icon: HelpCircle, tip: "nav.help" };

export const settingsNavItem = { href: "/settings", label: "Settings", icon: Settings };

export const studentNavItems = [
  { href: "/playground", label: "Playground", icon: Puzzle, tip: "nav.playground" },
  { href: "/gesture-practice", label: "Gestures", icon: Hand, tip: "nav.gestures" },
  { href: "/activities", label: "Activities", icon: Shapes, tip: "nav.activities" }
];

export const studentRouteHrefs = studentNavItems.map((item) => item.href);

export const adminNavItem = { href: "/admin", label: "Admin", icon: Shield, tip: "nav.admin" };
