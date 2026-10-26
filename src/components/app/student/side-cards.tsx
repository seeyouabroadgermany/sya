"use client";

import { startTransition, useOptimistic, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/app/date-picker";
import { setFollowup } from "@/lib/actions/students";
import { createTask, setTaskDone } from "@/lib/actions/tasks";
import { addDays, daysBetween, formatDate, relativeDay, todayIST } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/lib/data";

export function FollowupCard({ studentId, value }: { studentId: string; value: string | null }) {
  const [date, setDate] = useOptimistic(value);
  const overdue = !!date && daysBetween(todayIST(), date) < 0;
  const today = !!date && date === todayIST();

  function change(next: string | null) {
    startTransition(async () => {
      setDate(next);
      const res = await setFollowup(studentId, next);
      if (res.ok) toast.success(next ? `Follow-up set for ${formatDate(next)}` : "Follow-up cleared");
      else toast.error(res.error);
    });
  }

  return (
    <section
      aria-label="Next follow-up"
      className={cn(
        "rounded-[12px] border border-line bg-surface p-4",
        overdue && "border-danger/50",
        today && "border-warning/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Next follow-up</h2>
        {date && (
          <span className={cn("text-xs text-subtle", overdue && "font-medium text-danger", today && "font-medium text-warning")}>
            {relativeDay(date)}
          </span>
        )}
      </div>
      <DatePicker value={date} onChange={change} allowClear placeholder="No follow-up set" className="mt-3 w-full" aria-label="Next follow-up date" />
    </section>
  );
}

type Task = StudentProfile["tasks"][number];

export function StudentTasksCard({ studentId, tasks }: { studentId: string; tasks: Task[] }) {
  const [items, toggle] = useOptimistic(tasks, (state, id: string) =>
    state.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
  );
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<string | null>(addDays(todayIST(), 1));
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();
  const open = items.filter((t) => !t.done);
  const done = items.filter((t) => t.done);

  return (
    <section aria-label="Tasks" className="rounded-[12px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Tasks</h2>
        <Button size="sm" variant="ghost" onClick={() => setAdding((a) => !a)} className="text-subtle">
          <Plus /> Add
        </Button>
      </div>
      {adding && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!due) return toast.error("Pick a due date");
            start(async () => {
              const res = await createTask({ title, due_on: due, student_id: studentId });
              if (res.ok) {
                setTitle("");
                setAdding(false);
                toast.success("Task added");
              } else toast.error(res.error);
            });
          }}
        >
          <Input autoFocus placeholder="What needs doing?" aria-label="Task" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2">
            <DatePicker value={due} onChange={setDue} className="flex-1" aria-label="Due date" />
            <Button type="submit" disabled={pending || title.trim().length < 2}>
              {pending && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      )}
      <ul className="mt-2 space-y-1">
        {[...open, ...done].map((t) => {
          const overdue = !t.done && daysBetween(todayIST(), t.due_on) < 0;
          return (
            <li key={t.id} className="flex items-start gap-3 rounded-lg py-1.5">
              <Checkbox
                checked={t.done}
                aria-label={`Done: ${t.title}`}
                className="mt-0.5 size-5"
                onCheckedChange={() =>
                  startTransition(async () => {
                    toggle(t.id);
                    const res = await setTaskDone(t.id, !t.done);
                    if (!res.ok) toast.error(res.error);
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", t.done && "text-subtle line-through")}>{t.title}</p>
                <p className={cn("num text-xs text-subtle", overdue && "text-danger")}>{relativeDay(t.due_on)}</p>
              </div>
            </li>
          );
        })}
        {items.length === 0 && !adding && <li className="py-2 text-sm text-subtle">No tasks for this student.</li>}
      </ul>
    </section>
  );
}
