"use client";

import { cn } from "@/lib/utils";

// Small set of mutually exclusive choices, big enough to tap on a phone.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  className,
  tone,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  name: string;
  className?: string;
  tone?: (value: T) => "success" | "danger" | undefined;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("inline-flex rounded-lg border border-line bg-bg p-0.5", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        const t = selected ? tone?.(o.value) : undefined;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 min-w-14 flex-1 rounded-md px-3 text-sm whitespace-nowrap text-subtle transition-colors hover:text-text disabled:opacity-50 md:h-8",
              selected && "bg-surface-2 font-medium text-text",
              t === "success" && "bg-success-soft text-success",
              t === "danger" && "bg-danger-soft text-danger",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Wrapping row of tappable chips (single choice).
export function ChipChoice<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-9 rounded-full border border-line px-3.5 text-sm text-subtle transition-colors hover:text-text md:h-8",
              selected && "border-brand bg-brand-soft text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
