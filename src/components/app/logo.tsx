import { cn } from "@/lib/utils";

// Black logo on light, white logo on dark. Both are rendered; CSS shows the right one.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block aspect-[740/272] shrink-0 self-start", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-black.png" alt="See You Abroad" className="absolute inset-0 size-full dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-white.png" alt="See You Abroad" className="absolute inset-0 hidden size-full dark:block" />
    </span>
  );
}
