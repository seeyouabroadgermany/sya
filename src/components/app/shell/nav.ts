import { BarChart3, CheckSquare, Columns3, Inbox, type LucideIcon, Settings, Users, Wallet } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  mobile?: boolean; // shown in the phone tab bar (max 3); the rest live under "More"
  badge?: "today" | "leads";
};

// Pages are added here as each build phase lands.
export const NAV: NavItem[] = [
  { href: "/", label: "Pipeline", icon: Columns3, mobile: true },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, mobile: true, badge: "today" },
  { href: "/students", label: "Students", icon: Users, mobile: true },
  { href: "/leads", label: "New leads", icon: Inbox, adminOnly: true, badge: "leads" },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/students") return pathname.startsWith("/students");
  return pathname === href || pathname.startsWith(href + "/");
}
