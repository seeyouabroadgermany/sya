"use client";

import { startTransition, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AlarmClock, Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PersonAvatar } from "@/components/app/avatar";
import { DatePicker } from "@/components/app/date-picker";
import { completeFollowup, createTask, setTaskDone, snoozeFollowup, snoozeTask } from "@/lib/actions/tasks";
import { relativeDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BoardStudent, TodayData } from "@/lib/data";

type Task = TodayData["tasks"][number];

export function TodayView({ data, isAdmin }: { data: TodayData; isAdmin: boolean }) {
  const { today } = data;
  // Rows disappear the moment they're done or snoozed; the server refresh confirms it.
  const [hidden, hide] = useOptimistic<Set<string>, string>(new Set(), (s, id) => new Set(s).add(id));
  const followups = data.followups.filter((s) => !hidden.has(`f-${s.id}`));
  const tasks = data.tasks.filter((t) => !hidden.has(`t-${t.id}`));

  const overdueF = followups.filter((s) => s.next_followup_on! < today);
  const todayF = followups.filter((s) => s.next_followup_on === today);
  const soonF = followups.filter((s) => s.next_followup_on! > today);
  const dueTasks = tasks.filter((t) => t.due_on <= today);
  const soonTasks = tasks.filter((t) => t.due_on > today);

  const run = (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    startTransition(async () => {
      hide(key);
      const res = await fn();
      if (res.ok) toast.success(msg);
      else toast.error(res.error);
    });

  const nothingNow = overdueF.length + todayF.length + dueTasks.length + data.stuck.length === 0;

  return (
    <div className="space-y-8 px-4 pb-10 md:px-6">
      <div className="flex flex-wrap gap-2">
        <Count label="Overdue" n={overdueF.length + dueTasks.filter((t) => t.due_on < today).length} tone="danger" />
        <Count label="Due today" n={todayF.length + dueTasks.filter((t) => t.due_on === today).length} tone="warning" />
        <Count label="Stuck" n={data.stuck.length} tone="warning" />
      </div>

      {nothingNow && (
        <div className="rounded-[12px] border border-dashed border-line px-6 py-12 text-center">
          <Check className="mx-auto size-6 text-success" />
          <p className="mt-3 font-medium">Nothing due today</p>
          <p className="mt-1 text-sm text-subtle">Follow-ups and tasks you set will show up here on their day.</p>
        </div>
      )}

      <Section title="Overdue follow-ups" items={overdueF} tone="danger">
        {(s) => <FollowupRow key={s.id} s={s} isAdmin={isAdmin} run={run} />}
      </Section>
      <Section title="Follow-ups today" items={todayF}>
        {(s) => <FollowupRow key={s.id} s={s} isAdmin={isAdmin} run={run} />}
      </Section>
      <Section title="Tasks" items={dueTasks}>
        {(t) => <TaskRow key={t.id} t={t} today={today} isAdmin={isAdmin} run={run} />}
      </Section>
      <Section title="Stuck students" items={data.stuck} hint="In the same stage longer than its limit. Move them on or add a note.">
        {(s) => (
          <li key={s.id}>
            <Link href={`/students/${s.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-surface-2">
              <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.full_name}</span>
                <span className="block truncate text-xs text-subtle">{s.stage_name}</span>
              </span>
              {isAdmin && <PersonAvatar name={s.counsellor_name} />}
              <span className="num text-sm font-medium text-warning">{s.days_in_stage} days</span>
            </Link>
          </li>
        )}
      </Section>
      {(soonF.length > 0 || soonTasks.length > 0) && (
        <div className="space-y-8 opacity-90">
          <Section title="Follow-ups this week" items={soonF}>
            {(s) => <FollowupRow key={s.id} s={s} isAdmin={isAdmin} run={run} />}
          </Section>
          <Section title="Tasks this week" items={soonTasks}>
            {(t) => <TaskRow key={t.id} t={t} today={today} isAdmin={isAdmin} run={run} />}
          </Section>
        </div>
      )}
    </div>
  );
}

function Count({ label, n, tone }: { label: string; n: number; tone: "danger" | "warning" }) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm text-subtle",
        n > 0 && tone === "danger" && "border-danger/40 bg-danger-soft text-danger",
        n > 0 && tone === "warning" && "border-warning/40 bg-warning-soft text-warning",
      )}
    >
      <span className="num text-base font-semibold">{n}</span>
      {label}
    </div>
  );
}

function Section<T>({
  title,
  items,
  children,
  hint,
  tone,
}: {
  title: string;
  items: T[];
  children: (item: T) => React.ReactNode;
  hint?: string;
  tone?: "danger";
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className={cn("text-base font-semibold", tone === "danger" && "text-danger")}>{title}</h2>
        <span className="num text-sm text-subtle">{items.length}</span>
      </div>
      {hint && <p className="mb-2 text-xs text-subtle">{hint}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-[12px] border border-line bg-surface">{items.map(children)}</ul>
    </section>
  );
}

type Run = (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => void;

function SnoozeMenu({ onSnooze }: { onSnooze: (days: number) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-subtle" aria-label="Snooze">
          <AlarmClock />
          <span className="hidden sm:inline">Snooze</span>
          <ChevronDown className="hidden sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onSnooze(1)}>Tomorrow</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSnooze(3)}>In 3 days</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSnooze(7)}>Next week</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FollowupRow({ s, isAdmin, run }: { s: BoardStudent; isAdmin: boolean; run: Run }) {
  const overdue = s.followup_overdue;
  return (
    <li className="flex items-center gap-2 py-2 pr-2 pl-3">
      <Link href={`/students/${s.id}`} className="min-w-0 flex-1 py-1">
        <span className="block truncate text-sm font-medium">{s.full_name}</span>
        <span className="block truncate text-xs text-subtle">
          <span className={cn("num", overdue && "text-danger")}>{relativeDay(s.next_followup_on)}</span>
          <span>, {s.stage_name}</span>
        </span>
      </Link>
      {isAdmin && <PersonAvatar name={s.counsellor_name} className="hidden sm:inline-grid" />}
      <SnoozeMenu onSnooze={(d) => run(`f-${s.id}`, () => snoozeFollowup(s.id!, d), `Follow-up moved for ${s.full_name}`)} />
      <Button
        size="sm"
        variant="outline"
        onClick={() => run(`f-${s.id}`, () => completeFollowup(s.id!, null), `Follow-up with ${s.full_name} done`)}
      >
        <Check /> Done
      </Button>
    </li>
  );
}

function TaskRow({ t, today, isAdmin, run }: { t: Task; today: string; isAdmin: boolean; run: Run }) {
  const overdue = t.due_on < today;
  return (
    <li className="flex items-center gap-3 py-2 pr-2 pl-3">
      <Checkbox
        className="size-5"
        aria-label={`Mark done: ${t.title}`}
        onCheckedChange={() => run(`t-${t.id}`, () => setTaskDone(t.id, true), "Task done")}
      />
      <div className="min-w-0 flex-1 py-1">
        <p className="text-sm">{t.title}</p>
        <p className="truncate text-xs text-subtle">
          <span className={cn("num", overdue && "text-danger")}>{relativeDay(t.due_on)}</span>
          {t.student && (
            <>
              {", "}
              <Link href={`/students/${t.student.id}`} className="underline-offset-2 hover:text-text hover:underline">
                {t.student.full_name}
              </Link>
            </>
          )}
        </p>
      </div>
      {isAdmin && <PersonAvatar name={t.assignee?.full_name} className="hidden sm:inline-grid" />}
      <SnoozeMenu onSnooze={(d) => run(`t-${t.id}`, () => snoozeTask(t.id, d), "Task moved")} />
    </li>
  );
}

export function NewTaskButton({ isAdmin, team }: { isAdmin: boolean; team: { id: string; full_name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<string | null>(null);
  const [who, setWho] = useState("me");
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Task
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>For anything not tied to one student. Student tasks live on their profile.</DialogDescription>
          </DialogHeader>
          <form
            id="new-task"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!due) return toast.error("Pick a due date");
              start(async () => {
                const res = await createTask({ title, due_on: due, assigned_to: who === "me" ? "" : who });
                if (res.ok) {
                  toast.success("Task added");
                  setOpen(false);
                  setTitle("");
                  setDue(null);
                } else toast.error(res.error);
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="task-title">Task</Label>
              <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Due</Label>
              <DatePicker value={due ?? null} onChange={setDue} className="w-full" aria-label="Due date" />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>For</Label>
                <Select value={who} onValueChange={setWho}>
                  <SelectTrigger className="w-full" aria-label="Assign to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">Me</SelectItem>
                    {team.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form>
          <DialogFooter>
            <Button type="submit" form="new-task" disabled={pending || title.trim().length < 2}>
              {pending && <Loader2 className="animate-spin" />}
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

