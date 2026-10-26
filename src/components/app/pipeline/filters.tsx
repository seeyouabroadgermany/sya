"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { MONTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type FilterOptions = {
  intakes: { value: string; month: number; year: number }[];
  universities: { id: string; name: string }[];
  counsellors: { id: string; full_name: string }[] | null; // null = hide (staff)
};

const KEYS = ["intake", "university", "counsellor", "level", "stuck"] as const;

export function BoardFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(params.get("q") ?? "");

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }
  const activeCount = KEYS.filter((k) => params.get(k)).length;

  const controls = (
    <>
      <FilterSelect label="Intake" allLabel="All intakes" value={params.get("intake")} onChange={(v) => set("intake", v)}
        items={options.intakes.map((i) => ({ value: i.value, label: `${MONTHS[i.month - 1]} ${i.year}` }))} />
      <FilterSelect label="University" allLabel="All universities" value={params.get("university")} onChange={(v) => set("university", v)}
        items={options.universities.map((u) => ({ value: u.id, label: u.name }))} />
      {options.counsellors && (
        <FilterSelect label="Counsellor" allLabel="All counsellors" value={params.get("counsellor")} onChange={(v) => set("counsellor", v)}
          items={[{ value: "none", label: "Unassigned" }, ...options.counsellors.map((c) => ({ value: c.id, label: c.full_name }))]} />
      )}
      <FilterSelect label="Level" allLabel="Both levels" value={params.get("level")} onChange={(v) => set("level", v)}
        items={[{ value: "bachelor", label: "Bachelor's" }, { value: "master", label: "Master's" }]} />
      <label className="flex h-10 items-center gap-2 rounded-lg px-1 text-sm text-subtle md:h-9">
        <Switch checked={params.get("stuck") === "1"} onCheckedChange={(on) => set("stuck", on ? "1" : null)} />
        Stuck only
      </label>
    </>
  );

  return (
    <div className="flex items-center gap-2 px-4 pb-4 md:flex-wrap md:px-6">
      <form
        className="relative min-w-0 flex-1 md:max-w-64 md:flex-none"
        onSubmit={(e) => {
          e.preventDefault();
          set("q", q.trim() || null);
        }}
      >
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => (params.get("q") ?? "") !== q.trim() && set("q", q.trim() || null)}
          placeholder="Search name or phone"
          aria-label="Search students"
          className="pl-9"
        />
      </form>
      <div className="hidden items-center gap-2 md:flex md:flex-wrap">{controls}</div>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          className="hidden text-subtle md:inline-flex"
          onClick={() => start(() => router.replace(pathname, { scroll: false }))}
        >
          <X /> Clear
        </Button>
      )}
      <Button variant="outline" className="md:hidden" onClick={() => setOpen(true)} aria-label="Filters">
        <SlidersHorizontal />
        {activeCount > 0 && <span className="num">{activeCount}</span>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(16px,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-5 pt-5">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="grid gap-3 px-5 [&_button[role=combobox]]:w-full">{controls}</div>
          <div className="flex gap-2 px-5 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => start(() => router.replace(pathname))}>
              Clear all
            </Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>
              Show students
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  items,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="grid gap-1.5 md:block">
      <Label className="text-xs text-subtle md:sr-only">{label}</Label>
      <Select value={value ?? "all"} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className={cn("min-w-36", value && "border-brand/60 text-text")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
