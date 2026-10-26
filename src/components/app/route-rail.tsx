import { cn } from "@/lib/utils";

/*
  The student's journey as a line with one stop per stage.
  Done stops are filled, the current stop is a blue ring with a pupil (a nod to the eye in the logo),
  later stops are hollow.
*/
export function RouteRail({
  total,
  current,
  completed = false,
  size = "sm",
  className,
  label,
}: {
  total: number;
  current: number;
  completed?: boolean;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  const stops = Array.from({ length: total }, (_, i) => i + 1);
  const dot = size === "sm" ? "size-[7px]" : "size-2.5";
  const ring = size === "sm" ? "size-[11px]" : "size-4";
  return (
    <div
      role="img"
      aria-label={label ?? (completed ? "All stages done" : `Stage ${current} of ${total}`)}
      className={cn("flex items-center", className)}
    >
      {stops.map((n) => {
        const done = completed || n < current;
        const isCurrent = !completed && n === current;
        return (
          <div key={n} className={cn("flex items-center", n < total && "flex-1")}>
            {isCurrent ? (
              <span className={cn("grid shrink-0 place-items-center rounded-full border-2 border-brand", ring)}>
                <span className={cn("rounded-full bg-brand", size === "sm" ? "size-[3px]" : "size-1.5")} />
              </span>
            ) : (
              <span
                className={cn(
                  "shrink-0 rounded-full",
                  dot,
                  done ? "bg-text" : "border border-subtle/50 bg-transparent",
                )}
              />
            )}
            {n < total && (
              <span className={cn("h-px flex-1", completed || n < current ? "bg-text/60" : "bg-line")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
