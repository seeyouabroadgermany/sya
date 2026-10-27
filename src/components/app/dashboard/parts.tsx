import { cn } from "@/lib/utils";

export function Tile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number | string;
  detail?: React.ReactNode;
  tone?: "warning" | "success";
}) {
  return (
    <div className="rounded-[12px] border border-line bg-surface p-4">
      <p className="text-sm text-subtle">{label}</p>
      <p
        className={cn(
          "num mt-2 text-[28px] leading-none font-semibold tracking-tight",
          tone === "warning" && Number(value) > 0 && "text-warning",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-2 text-xs text-subtle">{detail}</p>}
    </div>
  );
}

export function Panel({ title, note, children, className }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[12px] border border-line p-4", className)}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {note && <p className="text-xs text-subtle">{note}</p>}
      </div>
      {children}
    </section>
  );
}

// Horizontal bars with the number written beside each one: readable without hovering or colour.
export function BarList({
  rows,
  max,
  showShare,
}: {
  rows: { label: string; value: number; prefix?: string }[];
  max?: number;
  showShare?: number; // total to show each row's share of
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">
              {r.prefix && <span className="num mr-1.5 text-subtle">{r.prefix}</span>}
              {r.label}
            </span>
            <span className="num shrink-0 font-medium">
              {r.value}
              {showShare ? <span className="ml-1.5 font-normal text-subtle">{Math.round((r.value / Math.max(1, showShare)) * 100)}%</span> : null}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full bg-chart-context" style={{ width: `${(r.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
