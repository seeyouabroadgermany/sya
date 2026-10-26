"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, formatDate, todayIST } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUICK = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
];

function toDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Date picker with one-tap shortcuts. Value is "YYYY-MM-DD" or null.
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  allowClear = false,
  quick = true,
  className,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  quick?: boolean;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const pick = (v: string | null) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn("justify-start font-normal", !value && "text-subtle", className)}
        >
          <CalendarDays className="text-subtle" />
          <span className="num">{value ? formatDate(value) : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        {quick && (
          <div className="flex flex-wrap gap-1.5 border-b border-line p-2">
            {QUICK.map((q) => (
              <Button key={q.days} type="button" variant="secondary" size="sm" onClick={() => pick(addDays(todayIST(), q.days))}>
                {q.label}
              </Button>
            ))}
          </div>
        )}
        <Calendar
          mode="single"
          selected={value ? toDate(value) : undefined}
          defaultMonth={value ? toDate(value) : undefined}
          onSelect={(d) => d && pick(toIso(d))}
          weekStartsOn={1}
          className="[--cell-size:--spacing(10)] md:[--cell-size:--spacing(8)]"
        />
        {allowClear && value && (
          <div className="border-t border-line p-2">
            <Button type="button" variant="ghost" size="sm" className="w-full text-subtle" onClick={() => pick(null)}>
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
