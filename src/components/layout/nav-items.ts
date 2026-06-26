import {
  Activity,
  BookOpen,
  Hand,
  HelpCircle,
  Settings,
  Shield
} from "lucide-react";

export const baseNavItems = [
  { href: "/content", label: "Content", icon: BookOpen },
  { href: "/gesture-practice", label: "Gestures", icon: Hand },
  { href: "/activities", label: "Activities", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle }
];

export const studentNavItems = [
  { href: "/gesture-practice", label: "Gestures", icon: Hand },
  { href: "/activities", label: "Activities", icon: Activity }
];

export const adminNavItem = { href: "/admin", label: "Admin", icon: Shield };
