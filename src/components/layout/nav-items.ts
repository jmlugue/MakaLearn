import {
  Activity,
  BarChart3,
  BookOpen,
  Gauge,
  Hand,
  HelpCircle,
  Settings,
  Shield,
  Users
} from "lucide-react";

export const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/learners", label: "Learners", icon: Users },
  { href: "/content", label: "Content", icon: BookOpen },
  { href: "/gesture-practice", label: "Practice", icon: Hand },
  { href: "/activities", label: "Activities", icon: Activity },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle }
];

export const adminNavItem = { href: "/admin", label: "Admin", icon: Shield };
