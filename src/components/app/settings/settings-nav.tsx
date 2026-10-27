"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings/team", label: "Team" },
  { href: "/settings/pipeline", label: "Stages and steps" },
  { href: "/settings/documents", label: "Documents" },
  { href: "/settings/universities", label: "Universities" },
  { href: "/settings/messages", label: "WhatsApp messages" },
  { href: "/settings/general", label: "Leads and emails" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
      {ITEMS.map((i) => {
        const active = pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-subtle hover:bg-surface-2 hover:text-text",
              active && "bg-surface-2 font-medium text-text",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
