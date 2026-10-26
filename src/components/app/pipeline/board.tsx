"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ArrowRightLeft, Check } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { BoardStudent, Stage } from "@/lib/data";
import { StudentCard, StudentCardBody } from "./student-card";
import { useStageMover } from "./use-stage-mover";

type Move = { id: string; stageId: string };

export function PipelineBoard({ stages, students, isAdmin }: { stages: Stage[]; students: BoardStudent[]; isAdmin: boolean }) {
  const [optimistic, applyMove] = useOptimistic(students, (state, m: Move) => {
    const stage = stages.find((s) => s.id === m.stageId);
    return state.map((s) =>
      s.id === m.id
        ? { ...s, current_stage_id: m.stageId, stage_name: stage?.name ?? s.stage_name, stage_position: stage?.position ?? s.stage_position, days_in_stage: 0, is_stuck: false }
        : s,
    );
  });
  const { move, dialog } = useStageMover(isAdmin);
  const byStage = useMemo(() => {
    const map = new Map<string, BoardStudent[]>();
    stages.forEach((st) => map.set(st.id, []));
    optimistic.forEach((s) => s.current_stage_id && map.get(s.current_stage_id)?.push(s));
    return map;
  }, [optimistic, stages]);

  function requestMove(student: BoardStudent, stageId: string) {
    if (student.current_stage_id === stageId) return;
    const stage = stages.find((s) => s.id === stageId)!;
    startTransition(async () => {
      applyMove({ id: student.id!, stageId });
      await move({ studentId: student.id!, studentName: student.full_name!, stageId, stageName: stage.name });
    });
  }

  return (
    <>
      <DesktopBoard stages={stages} byStage={byStage} onMove={requestMove} />
      <MobileBoard stages={stages} byStage={byStage} onMove={requestMove} />
      {dialog}
    </>
  );
}

function StageHeader({ stage, count, total }: { stage: Stage; count: number; total: number }) {
  return (
    <div className="px-1 pb-3">
      <div className="flex items-center gap-2">
        <span className="num grid size-5 place-items-center rounded-full border border-line text-[11px] text-subtle">
          {stage.position}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{stage.name}</h2>
        <span className="num text-sm text-subtle">{count}</span>
      </div>
      <div className="mt-2.5 h-px bg-line" aria-hidden>
        <div className="h-px bg-brand" style={{ width: `${(stage.position / total) * 100}%` }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- desktop */

function DesktopBoard({
  stages,
  byStage,
  onMove,
}: {
  stages: Stage[];
  byStage: Map<string, BoardStudent[]>;
  onMove: (s: BoardStudent, stageId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [active, setActive] = useState<BoardStudent | null>(null);
  const all = useMemo(() => [...byStage.values()].flat(), [byStage]);

  function onDragStart(e: DragStartEvent) {
    setActive(all.find((s) => s.id === e.active.id) ?? null);
  }
  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const student = all.find((s) => s.id === e.active.id);
    if (student && e.over) onMove(student, String(e.over.id));
  }

  return (
    <DndContext id="pipeline-board" sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="hidden gap-3 overflow-x-auto px-6 pb-6 md:flex">
        {stages.map((stage) => (
          <Column key={stage.id} stage={stage} students={byStage.get(stage.id) ?? []} total={stages.length} />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>
        {active ? (
          <div className="w-[268px] rotate-[1.5deg] cursor-grabbing rounded-[12px] border border-brand bg-bg p-3">
            <StudentCardBody s={active} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ stage, students, total }: { stage: Stage; students: BoardStudent[]; total: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${stage.name}, ${students.length} students`}
      className={cn(
        "flex max-h-[calc(100dvh-152px)] w-[284px] shrink-0 flex-col rounded-[12px] border border-transparent bg-surface p-2 pt-3 transition-colors",
        isOver && "border-brand/60 bg-brand-soft",
      )}
    >
      <StageHeader stage={stage} count={students.length} total={total} />
      <div className="-mr-1 flex-1 space-y-2 overflow-y-auto pr-1">
        {students.map((s) => (
          <DraggableCard key={s.id} s={s} />
        ))}
        {students.length === 0 && (
          <p className="rounded-[12px] border border-dashed border-line px-3 py-6 text-center text-xs text-subtle">
            Drag a student here
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ s }: { s: BoardStudent }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: s.id! });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable student. Press space to pick up, arrows to move."
      className={cn("touch-manipulation", isDragging && "opacity-30")}
    >
      <StudentCard s={s} />
    </div>
  );
}

/* ---------------------------------------------------------------- phone */

function MobileBoard({
  stages,
  byStage,
  onMove,
}: {
  stages: Stage[];
  byStage: Map<string, BoardStudent[]>;
  onMove: (s: BoardStudent, stageId: string) => void;
}) {
  const firstWithStudents = stages.find((s) => (byStage.get(s.id)?.length ?? 0) > 0)?.id ?? stages[0]?.id;
  const [selected, setSelected] = useState(firstWithStudents);
  const [moving, setMoving] = useState<BoardStudent | null>(null);
  const stage = stages.find((s) => s.id === selected) ?? stages[0];
  const list = byStage.get(stage?.id ?? "") ?? [];

  return (
    <div className="md:hidden">
      <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3" role="tablist" aria-label="Stages">
        {stages.map((st) => {
          const count = byStage.get(st.id)?.length ?? 0;
          const on = st.id === stage?.id;
          return (
            <button
              key={st.id}
              role="tab"
              aria-selected={on}
              onClick={() => setSelected(st.id)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-full border border-line px-3 text-sm whitespace-nowrap text-subtle",
                on && "border-brand bg-brand-soft text-text",
              )}
            >
              <span className="num text-xs">{st.position}</span>
              {st.name}
              <span className={cn("num rounded-full bg-surface-2 px-1.5 text-xs", on && "bg-brand text-white")}>{count}</span>
            </button>
          );
        })}
      </div>
      {stage && (
        <div className="px-4">
          <div className="mb-3 h-px bg-line" aria-hidden>
            <div className="h-px bg-brand" style={{ width: `${(stage.position / stages.length) * 100}%` }} />
          </div>
          <div className="space-y-2">
            {list.map((s) => (
              <StudentCard key={s.id} s={s} className="pr-12">
                <button
                  type="button"
                  onClick={() => setMoving(s)}
                  aria-label={`Move ${s.full_name}`}
                  className="absolute top-2 right-2 grid size-9 place-items-center rounded-lg text-subtle hover:bg-surface-2 hover:text-text"
                >
                  <ArrowRightLeft className="size-4" />
                </button>
              </StudentCard>
            ))}
            {list.length === 0 && (
              <p className="rounded-[12px] border border-dashed border-line px-4 py-10 text-center text-sm text-subtle">
                No students in {stage.name} right now.
              </p>
            )}
          </div>
        </div>
      )}

      <Sheet open={!!moving} onOpenChange={(o) => !o && setMoving(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(16px,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-5 pt-5">
            <SheetTitle>Move {moving?.full_name}</SheetTitle>
            <SheetDescription>Pick the new stage.</SheetDescription>
          </SheetHeader>
          <div className="space-y-1 px-3">
            {stages.map((st) => {
              const current = st.id === moving?.current_stage_id;
              return (
                <button
                  key={st.id}
                  disabled={current}
                  onClick={() => {
                    const s = moving!;
                    setMoving(null);
                    onMove(s, st.id);
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-surface-2 disabled:text-subtle"
                >
                  <span className="num w-4 text-subtle">{st.position}</span>
                  <span className="flex-1">{st.name}</span>
                  {current && <Check className="size-4 text-brand-ink" />}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
