"use client";

import { startTransition, useOptimistic, useState } from "react";
import { Check, ChevronDown, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/app/date-picker";
import { Segmented } from "@/components/app/segmented";
import { useStageMover } from "@/components/app/pipeline/use-stage-mover";
import { moveStage, updateStep } from "@/lib/actions/students";
import { LEAD_SOURCES, labelOf, type LeadSource } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Stage, StepDef, StudentStep } from "@/lib/data";

type Val = { done: boolean; value: string | null };
type Values = Record<string, Val>;

const isComplete = (step: StepDef, v?: Val) => !!v?.done && (step.kind !== "pass_fail" || v.value === "pass");

export function ProgressTab({
  studentId,
  studentName,
  stages,
  steps,
  studentSteps,
  currentStageId,
  status,
  isAdmin,
  onOpenDetails,
  onMarkLost,
}: {
  studentId: string;
  studentName: string;
  stages: Stage[];
  steps: StepDef[];
  studentSteps: StudentStep[];
  currentStageId: string;
  status: string;
  isAdmin: boolean;
  onOpenDetails: () => void;
  onMarkLost: () => void;
}) {
  const server: Values = Object.fromEntries(studentSteps.map((s) => [s.step_id, { done: s.done, value: s.value }]));
  const [values, setOptimistic] = useOptimistic(server, (state, u: { id: string; v: Val }) => ({ ...state, [u.id]: u.v }));
  const current = stages.find((s) => s.id === currentStageId);
  // Stages the person opened or closed by hand. The current stage starts open, the rest closed.
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const { move, dialog } = useStageMover(isAdmin);

  const visible = (step: StepDef) =>
    !step.show_if_step_id || values[step.show_if_step_id]?.value === step.show_if_value;

  function save(step: StepDef, v: Val) {
    startTransition(async () => {
      setOptimistic({ id: step.id, v });
      const res = await updateStep(studentId, step.id, v);
      if (!res.ok) toast.error(res.error);
    });
  }

  function retryExam() {
    const result = steps.find((s) => s.key === "exam_result");
    const date = steps.find((s) => s.key === "exam_date");
    if (result) save(result, { done: false, value: null });
    if (date) save(date, { done: false, value: null });
    toast("Exam result cleared. Set the new exam date.");
  }

  async function changeUniversity() {
    const selection = stages.find((s) => s.position === 2);
    if (!selection) return;
    const res = await moveStage(studentId, selection.id);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${studentName} moved back to ${selection.name}. Pick a new final university.`);
    onOpenDetails();
  }

  const stepsByStage = (stageId: string) => steps.filter((s) => s.stage_id === stageId);

  return (
    <div>
      <ol className="relative">
        {stages.map((stage, idx) => {
          const list = stepsByStage(stage.id).filter(visible);
          const done = list.filter((s) => isComplete(s, values[s.id])).length;
          const required = list.filter((s) => s.required);
          const requiredLeft = required.filter((s) => !isComplete(s, values[s.id])).length;
          const pos = stage.position;
          const state =
            status === "completed" || (current && pos < current.position)
              ? "past"
              : stage.id === currentStageId
                ? "current"
                : "future";
          const expanded = toggled.has(stage.id) !== (stage.id === currentStageId);
          const next = stages[idx + 1];
          return (
            <li key={stage.id} className="relative pl-9">
              {idx < stages.length - 1 && (
                <span
                  aria-hidden
                  className={cn("absolute top-7 bottom-0 left-[11px] w-px", state === "past" ? "bg-text/50" : "bg-line")}
                />
              )}
              <StageDot state={state} className="absolute top-[13px] left-[5px]" />
              <button
                type="button"
                onClick={() =>
                  setToggled((o) => {
                    const n = new Set(o);
                    if (n.has(stage.id)) n.delete(stage.id);
                    else n.add(stage.id);
                    return n;
                  })
                }
                aria-expanded={expanded}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg py-2 pr-1 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", state === "future" && "text-subtle")}>
                    {stage.name}
                  </span>
                  {state === "current" && <span className="block text-xs text-brand-ink">Current stage</span>}
                </span>
                <span className={cn("num text-xs text-subtle", done === list.length && list.length > 0 && "text-success")}>
                  {done}/{list.length}
                </span>
                <ChevronDown className={cn("size-4 text-subtle transition-transform", expanded && "rotate-180")} />
              </button>

              {expanded && (
                <div className={cn("mb-4 rounded-[12px] border border-line", state === "current" && "border-brand/40")}>
                  <ul className="divide-y divide-line">
                    {list.map((step) => (
                      <StepRow
                        key={step.id}
                        step={step}
                        val={values[step.id]}
                        onChange={(v) => save(step, v)}
                        onOpenDetails={onOpenDetails}
                      >
                        {step.key === "exam_result" && values[step.id]?.value === "fail" && (
                          <FailurePrompt
                            title="Exam failed. What next?"
                            actions={[
                              { label: "Retry the exam", onClick: retryExam },
                              { label: "Change university", onClick: changeUniversity },
                              { label: "Mark as lost", onClick: onMarkLost, danger: true },
                            ]}
                          />
                        )}
                        {step.key === "visa_result" && values[step.id]?.value === "fail" && (
                          <FailurePrompt
                            title="Visa rejected. What next?"
                            actions={[
                              {
                                label: "Apply again",
                                onClick: () => {
                                  save(step, { done: false, value: null });
                                  toast("Visa result cleared for a new application.");
                                },
                              },
                              { label: "Change university", onClick: changeUniversity },
                              { label: "Mark as lost", onClick: onMarkLost, danger: true },
                            ]}
                          />
                        )}
                      </StepRow>
                    ))}
                  </ul>
                  {state === "current" && status !== "completed" && next && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-line p-3">
                      <span className="flex-1 text-xs text-subtle">
                        {requiredLeft === 0 ? "All required steps done." : `${requiredLeft} required step${requiredLeft > 1 ? "s" : ""} left`}
                      </span>
                      <Button
                        size="sm"
                        variant={requiredLeft === 0 ? "default" : "outline"}
                        onClick={() =>
                          move({ studentId, studentName, stageId: next.id, stageName: next.name })
                        }
                      >
                        Move to {next.name}
                      </Button>
                    </div>
                  )}
                  {state === "current" && status === "completed" && (
                    <p className="border-t border-line p-3 text-sm text-success">Visa approved. This student is completed.</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {dialog}
    </div>
  );
}

function StageDot({ state, className }: { state: "past" | "current" | "future"; className?: string }) {
  if (state === "past")
    return (
      <span className={cn("grid size-[13px] place-items-center rounded-full bg-text text-bg", className)}>
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  if (state === "current")
    return (
      <span className={cn("grid size-[13px] place-items-center rounded-full border-2 border-brand bg-bg", className)}>
        <span className="size-[3px] rounded-full bg-brand" />
      </span>
    );
  return <span className={cn("size-[13px] rounded-full border border-subtle/60 bg-bg", className)} />;
}

function FailurePrompt({
  title,
  actions,
}: {
  title: string;
  actions: { label: string; onClick: () => void; danger?: boolean }[];
}) {
  return (
    <div className="mt-3 rounded-lg bg-danger-soft p-3">
      <p className="text-sm font-medium text-danger">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            type="button"
            size="sm"
            variant={a.danger ? "destructive" : "outline"}
            onClick={a.onClick}
            className={a.danger ? "" : "bg-bg"}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function StepRow({
  step,
  val,
  onChange,
  onOpenDetails,
  children,
}: {
  step: StepDef;
  val?: Val;
  onChange: (v: Val) => void;
  onOpenDetails: () => void;
  children?: React.ReactNode;
}) {
  const v = val ?? { done: false, value: null };
  const complete = isComplete(step, v);
  const meta = (
    <span className="mt-0.5 block text-xs text-subtle">
      {!step.required && "Optional"}
      {step.key === "enquiry_received" && v.value && `Source: ${labelOf(LEAD_SOURCES, v.value as LeadSource) || v.value}`}
      {step.key === "final_choice" && (v.value ? v.value : "Star a final university in Details")}
    </span>
  );

  if (step.kind === "tick") {
    const locked = step.key === "final_choice";
    return (
      <li className="p-3">
        <div className="flex items-start gap-3">
          {locked ? (
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] border border-line",
                complete && "border-text bg-text text-bg",
              )}
            >
              {complete && <Check className="size-3.5" strokeWidth={3} />}
            </span>
          ) : (
            <Checkbox
              id={`step-${step.id}`}
              checked={v.done}
              onCheckedChange={(c) => onChange({ done: c === true, value: v.value })}
              className="mt-0.5 size-5"
            />
          )}
          <label htmlFor={locked ? undefined : `step-${step.id}`} className="min-w-0 flex-1 cursor-pointer">
            <span className={cn("block text-sm", complete && "text-subtle line-through decoration-subtle/50")}>{step.label}</span>
            {meta}
          </label>
          {locked && (
            <Button type="button" size="sm" variant="ghost" onClick={onOpenDetails} className="text-subtle">
              <Star /> Shortlist
            </Button>
          )}
        </div>
        {children}
      </li>
    );
  }

  return (
    <li className="p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-line",
              complete && "border-success bg-success text-white",
              step.kind === "pass_fail" && v.value === "fail" && "border-danger bg-danger text-white",
            )}
            aria-hidden
          >
            {complete && <Check className="size-3" strokeWidth={3} />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm">{step.label}</span>
            {meta}
          </span>
        </div>
        <div className="pl-8 sm:pl-0">
          {step.kind === "yes_no" && (
            <Segmented
              name={step.label}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              value={v.value as "yes" | "no" | null}
              onChange={(value) => onChange({ done: true, value })}
            />
          )}
          {step.kind === "pass_fail" && (
            <Segmented
              name={step.label}
              options={[
                { value: "pass", label: step.pass_label ?? "Passed" },
                { value: "fail", label: step.fail_label ?? "Failed" },
              ]}
              value={v.value as "pass" | "fail" | null}
              onChange={(value) => onChange({ done: true, value })}
              tone={(value) => (value === "pass" ? "success" : "danger")}
            />
          )}
          {step.kind === "date" && (
            <DatePicker
              aria-label={step.label}
              value={v.value}
              onChange={(value) => onChange({ done: !!value, value })}
              placeholder="Set date"
              allowClear
              quick={false}
              className="w-44"
            />
          )}
          {step.kind === "text" && <TextStep value={v.value} onSave={(value) => onChange({ done: !!value, value })} />}
        </div>
      </div>
      {step.kind === "date" && v.value && <span className="sr-only">{formatDate(v.value)}</span>}
      {children}
    </li>
  );
}

function TextStep({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [text, setText] = useState(value ?? "");
  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== (value ?? "") && onSave(text.trim() || null)}
      className="sm:w-56"
    />
  );
}
