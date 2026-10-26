import { CheckSquare, Columns3, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean; mobile?: boolean };

// Pages are added here as each build phase lands.
export const NAV: NavItem[] = [
  { href: "/", label: "Pipeline", icon: Columns3, mobile: true },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, mobile: true },
];


export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/students/");
  return pathname === href || pathname.startsWith(href + "/");
}
