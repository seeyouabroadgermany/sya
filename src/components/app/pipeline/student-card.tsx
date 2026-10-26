import Link from "next/link";
import { PersonAvatar } from "@/components/app/avatar";
import { intakeLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardStudent } from "@/lib/data";

export function StepProgress({ done, total, className }: { done: number; total: number; className?: string }) {
  const complete = total > 0 && done >= total;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} aria-label={`${done} of ${total} steps done`}>
      <span className="flex gap-[2px]">
        {Array.from({ length: Math.max(total, 1) }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-2 rounded-[1px]",
              i < done ? (complete ? "bg-success" : "bg-text/70") : "bg-line",
            )}
          />
        ))}
      </span>
      <span className={cn("num text-xs text-subtle", complete && "text-success")}>
        {done}/{total}
      </span>
    </span>
  );
}

export function StudentCardBody({ s, showStage = false }: { s: BoardStudent; showStage?: boolean }) {
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.full_name}</span>
        {s.followup_overdue && (
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-danger" title="Follow-up overdue" aria-label="Follow-up overdue" />
        )}
      </div>
      {showStage && <div className="mt-0.5 truncate text-xs text-text/80">{s.stage_name}</div>}
      <div className="mt-0.5 flex items-baseline gap-2 text-xs text-subtle">
        <span className="min-w-0 flex-1 truncate">{s.final_university ?? "University not chosen"}</span>
        {s.intake_month ? <span className="num shrink-0">{intakeLabel(s.intake_month, s.intake_year)}</span> : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <PersonAvatar name={s.counsellor_name} className="size-5 text-[9px]" />
        <StepProgress done={s.steps_done ?? 0} total={s.steps_total ?? 0} />
        <span
          className={cn("num ml-auto text-xs text-subtle", s.is_stuck && "font-medium text-warning")}
          title={`${s.days_in_stage} days in this stage`}
        >
          {s.days_in_stage}d
        </span>
      </div>
      {s.status === "on_hold" && <div className="mt-2 text-[11px] text-subtle">On hold</div>}
    </>
  );
}

export function StudentCard({ s, className, children }: { s: BoardStudent; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "group relative rounded-[12px] border border-line bg-bg p-3 transition-colors hover:border-subtle/50",
        s.is_stuck && "border-warning/70 hover:border-warning",
        className,
      )}
    >
      <Link href={`/students/${s.id}`} className="block rounded-[10px] outline-offset-4">
        <StudentCardBody s={s} />
      </Link>
      {children}
    </div>
  );
}
