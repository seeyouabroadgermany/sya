"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// A text field that saves when you leave it (or press Enter).
export function InlineText({
  value,
  onSave,
  label,
  className,
  inputMode,
  type,
}: {
  value: string;
  onSave: (v: string) => Promise<{ ok: boolean; error?: string }>;
  label: string;
  className?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: string;
}) {
  const [text, setText] = useState(value);
  const [pending, start] = useTransition();
  function commit() {
    if (text.trim() === value.trim()) return;
    start(async () => {
      const res = await onSave(text.trim());
      if (res.ok) toast.success("Saved");
      else {
        toast.error(res.error);
        setText(value);
      }
    });
  }
  return (
    <Input
      aria-label={label}
      value={text}
      type={type}
      inputMode={inputMode}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
      disabled={pending}
      className={cn("bg-transparent", className)}
    />
  );
}
