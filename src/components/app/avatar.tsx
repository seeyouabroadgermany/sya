import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

// Neutral initials avatar. Blue is reserved for actions, so avatars stay grey.
export function PersonAvatar({ name, className }: { name: string | null | undefined; className?: string }) {
  return (
    <span
      title={name ?? "Unassigned"}
      className={cn(
        "inline-grid size-6 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[10px] font-semibold text-text",
        !name && "border-dashed text-subtle",
        className,
      )}
    >
      {name ? initials(name) : "–"}
    </span>
  );
}
