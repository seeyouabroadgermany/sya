"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// The server doesn't know the saved theme, so labels switch with CSS instead of state.
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-text",
        withLabel ? "h-10 w-full px-3" : "size-9 justify-center",
        className,
      )}
      aria-label={withLabel ? undefined : "Switch between light and dark mode"}
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
      {withLabel && (
        <>
          <span className="dark:hidden">Dark mode</span>
          <span className="hidden dark:inline">Light mode</span>
        </>
      )}
    </button>
  );
}
