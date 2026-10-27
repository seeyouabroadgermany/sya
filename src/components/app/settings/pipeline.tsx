"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronDown, EyeOff, Lock, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { reorder, saveStage, saveStep, setStageActive, setStepActive } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";
import { InlineText } from "./inline-text";
import { SettingsSection } from "./section";

type Stage = Database["public"]["Tables"]["stages"]["Row"];
type Step = Database["public"]["Tables"]["stage_steps"]["Row"];
type Kind = Step["kind"];

const KINDS: { value: Kind; label: string }[] = [
  { value: "tick", label: "Tick box" },
  { value: "yes_no", label: "Yes / No" },
  { value: "date", label: "Date" },
  { value: "pass_fail", label: "Result (pass / fail)" },
  { value: "text", label: "Short text" },
];

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else if (success) toast.success(success);
    });
  return { pending, run };
}

function move<T extends { id: string }>(list: T[], index: number, dir: -1 | 1) {
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(index + dir, 0, item);
  return next.map((x) => x.id);
}

export function PipelineSettings({ stages, steps }: { stages: Stage[]; steps: Step[] }) {
  const { pending, run } = useRun();
  const [open, setOpen] = useState<string | null>(null);
  const [newStage, setNewStage] = useState("");
  const shown = stages.filter((s) => s.active).sort((a, b) => a.position - b.position);
  const hidden = stages.filter((s) => !s.active);

  return (
    <SettingsSection
      title="Stages and steps"
      description="The Czech pipeline. A student moves on when every required step is done. Changes apply to all students straight away."
    >
      <ol className="space-y-2">
        {shown.map((stage, i) => {
          const stageSteps = steps.filter((s) => s.stage_id === stage.id).sort((a, b) => a.position - b.position);
          const expanded = open === stage.id;
          return (
            <li key={stage.id} className="rounded-[12px] border border-line">
              <div className="flex flex-wrap items-center gap-2 p-2 pl-3">
                <span className="num w-5 text-sm text-subtle">{i + 1}</span>
                <InlineText
                  label="Stage name"
                  value={stage.name}
                  onSave={(name) => saveStage(stage.id, { name, stuck_after_days: stage.stuck_after_days })}
                  className="min-w-40 flex-1 font-medium"
                />
                <label className="flex items-center gap-1.5 text-xs text-subtle">
                  Stuck after
                  <InlineText
                    label={`Stuck after days for ${stage.name}`}
                    value={String(stage.stuck_after_days)}
                    inputMode="numeric"
                    onSave={(v) => saveStage(stage.id, { name: stage.name, stuck_after_days: Number(v) })}
                    className="num w-14 text-center"
                  />
                  days
                </label>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" aria-label={`Move ${stage.name} up`} disabled={i === 0 || pending}
                    onClick={() => run(() => reorder("stages", [...move(shown, i, -1), ...hidden.map((h) => h.id)]))}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Move ${stage.name} down`} disabled={i === shown.length - 1 || pending}
                    onClick={() => run(() => reorder("stages", [...move(shown, i, 1), ...hidden.map((h) => h.id)]))}>
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Hide ${stage.name}`} disabled={pending}
                    onClick={() => run(() => setStageActive(stage.id, false), `${stage.name} hidden`)}>
                    <EyeOff />
                  </Button>
                  <Button variant="ghost" size="sm" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : stage.id)} className="text-subtle">
                    <span className="num">{stageSteps.filter((s) => s.active).length} steps</span>
                    <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
                  </Button>
                </div>
              </div>
              {expanded && <StepsEditor stage={stage} steps={stageSteps} />}
            </li>
          );
        })}
      </ol>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await saveStage(null, { name: newStage, stuck_after_days: 7 });
            if (r.ok) setNewStage("");
            return r;
          }, "Stage added at the end");
        }}
      >
        <Input placeholder="New stage name" aria-label="New stage name" value={newStage} onChange={(e) => setNewStage(e.target.value)} />
        <Button type="submit" variant="outline" disabled={pending || !newStage.trim()}>
          <Plus /> Add stage
        </Button>
      </form>

      {hidden.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-subtle">Hidden stages</p>
          {hidden.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2 text-sm">
              <span className="flex-1 text-subtle">{s.name}</span>
              <Button variant="ghost" size="sm" onClick={() => run(() => setStageActive(s.id, true), `${s.name} shown again`)}>
                <RotateCcw /> Show again
              </Button>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

function StepsEditor({ stage, steps }: { stage: Stage; steps: Step[] }) {
  const { pending, run } = useRun();
  const shown = steps.filter((s) => s.active);
  const hidden = steps.filter((s) => !s.active);
  const questions = shown.filter((s) => s.kind === "yes_no");
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<Kind>("tick");

  const base = (s: Step) => ({
    stage_id: s.stage_id,
    label: s.label,
    kind: s.kind,
    required: s.required,
    show_if_step_id: s.show_if_step_id,
    show_if_value: s.show_if_value as "yes" | "no" | null,
    pass_label: s.pass_label,
    fail_label: s.fail_label,
  });

  return (
    <div className="border-t border-line bg-surface p-3">
      <ul className="space-y-2">
        {shown.map((s, i) => {
          const locked = !!s.key;
          const otherQuestions = questions.filter((q) => q.id !== s.id);
          return (
            <li key={s.id} className="rounded-lg border border-line bg-bg p-2">
              <div className="flex flex-wrap items-center gap-2">
                <InlineText label="Step" value={s.label} onSave={(label) => saveStep(s.id, { ...base(s), label })} className="min-w-48 flex-1" />
                <Select value={s.kind} disabled={locked || pending} onValueChange={(k) => run(() => saveStep(s.id, { ...base(s), kind: k as Kind }), "Saved")}>
                  <SelectTrigger aria-label="Step type" className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs text-subtle">
                  <Switch checked={s.required} disabled={pending} onCheckedChange={(v) => run(() => saveStep(s.id, { ...base(s), required: v }), v ? "Now required" : "Now optional")} />
                  Required
                </label>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" aria-label="Move step up" disabled={i === 0 || pending} onClick={() => run(() => reorder("steps", move(shown, i, -1)))}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Move step down" disabled={i === shown.length - 1 || pending} onClick={() => run(() => reorder("steps", move(shown, i, 1)))}>
                    <ArrowDown />
                  </Button>
                  {locked ? (
                    <span title="Used by the CRM. You can rename it only." className="grid size-10 place-items-center text-subtle md:size-9">
                      <Lock className="size-4" />
                    </span>
                  ) : (
                    <Button variant="ghost" size="icon" aria-label={`Hide ${s.label}`} disabled={pending} onClick={() => run(() => setStepActive(s.id, false), "Step hidden")}>
                      <EyeOff />
                    </Button>
                  )}
                </div>
              </div>
              {(otherQuestions.length > 0 || s.show_if_step_id) && !locked && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
                  Show
                  <Select
                    value={s.show_if_step_id ? `${s.show_if_step_id}|${s.show_if_value ?? "yes"}` : "always"}
                    disabled={pending}
                    onValueChange={(v) => {
                      const [id, val] = v === "always" ? [null, null] : v.split("|");
                      run(() => saveStep(s.id, { ...base(s), show_if_step_id: id, show_if_value: val as "yes" | "no" | null }), "Saved");
                    }}
                  >
                    <SelectTrigger aria-label="When to show this step" className="h-8 min-w-0 flex-1 text-xs sm:max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="always">always</SelectItem>
                      {otherQuestions.flatMap((q) => [
                        <SelectItem key={q.id + "yes"} value={`${q.id}|yes`}>only when &quot;{q.label}&quot; is Yes</SelectItem>,
                        <SelectItem key={q.id + "no"} value={`${q.id}|no`}>only when &quot;{q.label}&quot; is No</SelectItem>,
                      ])}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {s.kind === "pass_fail" && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-subtle">
                  Buttons say
                  <InlineText label="Pass label" value={s.pass_label ?? "Passed"} onSave={(v) => saveStep(s.id, { ...base(s), pass_label: v })} className="h-8 w-32 text-xs" />
                  and
                  <InlineText label="Fail label" value={s.fail_label ?? "Failed"} onSave={(v) => saveStep(s.id, { ...base(s), fail_label: v })} className="h-8 w-32 text-xs" />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await saveStep(null, { stage_id: stage.id, label, kind, required: true });
            if (r.ok) setLabel("");
            return r;
          }, "Step added. Every student in the CRM gets it.");
        }}
      >
        <Input placeholder={`New step in ${stage.name}`} aria-label="New step" value={label} onChange={(e) => setLabel(e.target.value)} className="min-w-48 flex-1" />
        <Select value={kind} onValueChange={(k) => setKind(k as Kind)}>
          <SelectTrigger aria-label="New step type" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" disabled={pending || !label.trim()}>
          <Plus /> Add step
        </Button>
      </form>

      {hidden.length > 0 && (
        <div className="mt-3 space-y-1">
          {hidden.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-1.5 text-sm">
              <span className="flex-1 text-subtle">{s.label} (hidden)</span>
              <Button variant="ghost" size="sm" onClick={() => run(() => setStepActive(s.id, true), "Step shown again")}>
                <RotateCcw /> Show again
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
