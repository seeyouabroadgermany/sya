"use client";

import { useState, useTransition } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
  StickyNote,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/app/segmented";
import { addActivity } from "@/lib/actions/students";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/lib/data";

type Kind = "note" | "call" | "whatsapp" | "email";

const ICONS: Record<string, LucideIcon> = {
  note: StickyNote,
  call: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  stage_change: ArrowRightLeft,
  step: CheckCircle2,
  payment: CircleDollarSign,
  document: FileCheck2,
  assignment: UserRound,
  status: UserRound,
  created: Sparkles,
};

const HUMAN = new Set(["note", "call", "whatsapp", "email"]);

export function ActivityTab({ studentId, items }: { studentId: string; items: StudentProfile["activity"] }) {
  const [kind, setKind] = useState<Kind>("note");
  const [body, setBody] = useState("");
  const [onlyNotes, setOnlyNotes] = useState(false);
  const [pending, start] = useTransition();
  const shown = onlyNotes ? items.filter((i) => HUMAN.has(i.kind)) : items;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await addActivity(studentId, { kind, body });
      if (res.ok) {
        setBody("");
        toast.success("Added to history");
      } else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3 rounded-[12px] border border-line p-3">
        <Segmented
          name="Type"
          value={kind}
          onChange={setKind}
          options={[
            { value: "note", label: "Note" },
            { value: "call", label: "Call" },
            { value: "whatsapp", label: "WhatsApp" },
            { value: "email", label: "Email" },
          ]}
          className="w-full sm:w-auto"
        />
        <Textarea
          aria-label="What happened?"
          placeholder={kind === "note" ? "Write a note" : "What was discussed?"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-subtle">Keep passport numbers out of notes.</p>
          <Button type="submit" disabled={pending || !body.trim()}>
            {pending && <Loader2 className="animate-spin" />}
            Add
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">History</h3>
        <Segmented
          name="Show"
          value={onlyNotes ? "notes" : "all"}
          onChange={(v) => setOnlyNotes(v === "notes")}
          options={[
            { value: "all", label: "Everything" },
            { value: "notes", label: "Notes and calls" },
          ]}
        />
      </div>
      <ol className="space-y-0">
        {shown.map((a, i) => {
          const Icon = ICONS[a.kind] ?? StickyNote;
          const human = HUMAN.has(a.kind);
          return (
            <li key={a.id} className="relative flex gap-3 pb-5">
              {i < shown.length - 1 && <span aria-hidden className="absolute top-8 bottom-0 left-[15px] w-px bg-line" />}
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-subtle",
                  human && "text-text",
                )}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <p className={cn("text-sm break-words whitespace-pre-wrap", !human && "text-subtle")}>
                  {a.body}
                </p>
                <p className="mt-1 text-xs text-subtle">
                  {a.author?.full_name ?? "System"}, <span className="num">{formatDateTime(a.created_at)}</span>
                </p>
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="text-sm text-subtle">Nothing here yet.</li>}
      </ol>
    </div>
  );
}
