"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Plus, UserRound } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { PersonAvatar } from "@/components/app/avatar";
import { QuickLeadSheet, type Counsellor } from "@/components/app/quick-lead";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav";
import { ThemeToggle } from "./theme-toggle";

type ShellUser = { fullName: string; email: string | null; isAdmin: boolean };

type Counts = { today: number; leads: number };

function Badge({ n, tone = "neutral", className }: { n: number; tone?: "neutral" | "brand"; className?: string }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        "num min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-medium",
        tone === "brand" ? "bg-brand text-white" : "bg-surface-2 text-text",
        className,
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AppShell({
  user,
  counsellors,
  counts,
  children,
}: {
  user: ShellUser;
  counsellors: Counsellor[];
  counts: Counts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [leadOpen, setLeadOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const items = NAV.filter((n) => !n.adminOnly || user.isAdmin);
  const mobileItems = items.filter((n) => n.mobile);
  const leftTabs = mobileItems.slice(0, 2);
  const rightTabs = mobileItems.slice(2, 3);
  const badgeFor = (item: (typeof NAV)[number]) => (item.badge ? counts[item.badge] : 0);
  const moreBadge = items.filter((i) => !i.mobile).reduce((n, i) => n + badgeFor(i), 0);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line md:flex">
        <div className="px-5 pt-6 pb-7">
          <Link href="/" aria-label="Pipeline">
            <Logo className="h-10" />
          </Link>
        </div>
        <div className="px-3">
          <button
            type="button"
            onClick={() => setLeadOpen(true)}
            className="flex h-10 w-full items-center gap-2 rounded-lg bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand/90"
          >
            <Plus className="size-4" /> New lead
          </button>
        </div>
        <nav className="mt-5 flex-1 space-y-0.5 px-3" aria-label="Main">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-text",
                  active && "bg-brand-soft text-text hover:bg-brand-soft",
                )}
              >
                <item.icon className={cn("size-4", active && "text-brand-ink")} />
                <span className="flex-1">{item.label}</span>
                <Badge n={badgeFor(item)} tone={item.badge === "leads" ? "brand" : "neutral"} />
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <Link
            href="/account"
            aria-current={pathname === "/account" ? "page" : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-2", pathname === "/account" && "bg-surface-2")}
          >
            <PersonAvatar name={user.fullName} className="size-8 text-xs" />
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{user.fullName}</div>
              <div className="truncate text-xs text-subtle">{user.isAdmin ? "Admin" : "Counsellor"}, my account</div>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action="/auth/signout" method="post" className="flex-1">
              <button className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-text">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Page */}
      <div className="min-w-0 pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>

      {/* Phone bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-safe backdrop-blur md:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center">
          {leftTabs.map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} badge={badgeFor(item)} />
          ))}
          {Array.from({ length: 2 - leftTabs.length }).map((_, i) => (
            <span key={i} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setLeadOpen(true)}
              aria-label="New lead"
              className="-mt-7 grid size-14 place-items-center rounded-full bg-brand text-white ring-4 ring-bg transition-transform active:scale-95"
            >
              <Plus className="size-6" />
            </button>
          </div>
          {rightTabs.map((item) => (
            <TabLink key={item.href} item={item} active={isActive(pathname, item.href)} badge={badgeFor(item)} />
          ))}
          {rightTabs.length === 0 && <span />}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="relative flex flex-col items-center gap-1 text-[11px] text-subtle"
          >
            <Menu className="size-5" />
            More
            {moreBadge > 0 && <span className="absolute top-0 right-[calc(50%-16px)] size-2 rounded-full bg-brand" aria-label="New leads waiting" />}
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(16px,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-5 pt-5">
            <SheetTitle className="flex items-center gap-3">
              <PersonAvatar name={user.fullName} className="size-9 text-xs" />
              <span className="text-left">
                <span className="block text-base">{user.fullName}</span>
                <span className="block text-xs font-normal text-subtle">{user.email}</span>
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-1 px-3">
            {items
              .filter((i) => !i.mobile)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-surface-2"
                >
                  <item.icon className="size-4 text-subtle" />
                  <span className="flex-1">{item.label}</span>
                  <Badge n={badgeFor(item)} tone={item.badge === "leads" ? "brand" : "neutral"} />
                </Link>
              ))}
            <Link href="/account" onClick={() => setMoreOpen(false)} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm hover:bg-surface-2">
              <UserRound className="size-4 text-subtle" />
              My account
            </Link>
            <ThemeToggle withLabel className="h-11 text-text" />
            <form action="/auth/signout" method="post">
              <button className="flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm hover:bg-surface-2">
                <LogOut className="size-4 text-subtle" /> Sign out
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <QuickLeadSheet open={leadOpen} onOpenChange={setLeadOpen} isAdmin={user.isAdmin} counsellors={counsellors} />
    </div>
  );
}

function TabLink({ item, active, badge }: { item: (typeof NAV)[number]; active: boolean; badge: number }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn("relative flex flex-col items-center gap-1 text-[11px] text-subtle", active && "text-text")}
    >
      <item.icon className={cn("size-5", active && "text-brand-ink")} />
      {item.label}
      <Badge n={badge} className="absolute -top-1.5 left-[calc(50%+4px)] min-w-4 px-1 text-[10px] leading-4" />
    </Link>
  );
}
