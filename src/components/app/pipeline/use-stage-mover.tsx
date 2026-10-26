"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { moveStage } from "@/lib/actions/students";

type Missing = { stage_name: string; label: string }[];
type Pending = { studentId: string; studentName: string; stageId: string; stageName: string; missing: Missing };

function MissingList({ missing }: { missing: Missing }) {
  return (
    <ul className="space-y-1 text-sm">
      {missing.slice(0, 8).map((m, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" />
          <span>
            {m.label} <span className="text-subtle">({m.stage_name})</span>
          </span>
        </li>
      ))}
      {missing.length > 8 && <li className="text-subtle">and {missing.length - 8} more</li>}
    </ul>
  );
}

/*
  Moves a student between stages. When required steps are missing:
  staff get a clear message; admin can move anyway with a written reason (logged).
*/
export function useStageMover(isAdmin: boolean) {
  const [blocked, setBlocked] = useState<Pending | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  async function move(args: { studentId: string; studentName: string; stageId: string; stageName: string }) {
    const res = await moveStage(args.studentId, args.stageId);
    if (res.ok) {
      toast.success(`${args.studentName} moved to ${args.stageName}`);
      return true;
    }
    if (res.missing?.length) {
      setReason("");
      setBlocked({ ...args, missing: res.missing });
    } else {
      toast.error(res.error);
    }
    return false;
  }

  function override() {
    if (!blocked) return;
    start(async () => {
      const res = await moveStage(blocked.studentId, blocked.stageId, reason);
      if (res.ok) {
        toast.success(`${blocked.studentName} moved to ${blocked.stageName}`);
        setBlocked(null);
      } else toast.error(res.error);
    });
  }

  const dialog = (
    <AlertDialog open={!!blocked} onOpenChange={(o) => !o && setBlocked(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finish these steps first</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked?.studentName} can move to {blocked?.stageName} once these required steps are done.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {blocked && <MissingList missing={blocked.missing} />}
        {isAdmin && (
          <div className="space-y-2 border-t border-line pt-4">
            <Label htmlFor="override-reason">Move anyway (admin)</Label>
            <Textarea
              id="override-reason"
              placeholder="Why skip these steps? This is saved in the student's history."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{isAdmin ? "Cancel" : "OK"}</AlertDialogCancel>
          {isAdmin && (
            <Button onClick={override} disabled={pending || reason.trim().length < 3}>
              {pending && <Loader2 className="animate-spin" />}
              Move anyway
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { move, dialog };
}
