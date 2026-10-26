"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, FolderOpen, Loader2, Mail, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RouteRail } from "@/components/app/route-rail";
import { assignStudent, setStatus } from "@/lib/actions/students";
import { STATUSES, labelOf, type StudentStatus } from "@/lib/constants";
import { telLink, whatsappLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/lib/data";

export function StudentHeader({
  profile,
  totalStages,
  isAdmin,
  team,
  lostOpen,
  setLostOpen,
}: {
  profile: StudentProfile;
  totalStages: number;
  isAdmin: boolean;
  team: { id: string; full_name: string }[];
  lostOpen: boolean;
  setLostOpen: (o: boolean) => void;
}) {
  const { student: s, board: b } = profile;
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const tel = telLink(s.phone);
  const wa = whatsappLink(s.whatsapp || s.phone);

  function changeStatus(status: StudentStatus, why?: string) {
    start(async () => {
      const res = await setStatus(s.id, { status, reason: why });
      if (res.ok) {
        toast.success(`Status changed to ${labelOf(STATUSES, status).toLowerCase()}`);
        setLostOpen(false);
      } else toast.error(res.error);
    });
  }

  const contact = [
    { label: "Call", icon: Phone, href: tel },
    { label: "WhatsApp", icon: MessageCircle, href: wa, external: true },
    { label: "Email", icon: Mail, href: s.email ? `mailto:${s.email}` : null },
    { label: "Drive", icon: FolderOpen, href: s.drive_folder_url, external: true },
  ];

  return (
    <header className="px-4 pt-4 md:px-6 md:pt-6">
      <Link href="/" className="inline-flex h-8 items-center gap-1 text-sm text-subtle hover:text-text">
        <ChevronLeft className="size-4" /> Pipeline
      </Link>
      <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight break-words md:text-[28px]">{s.full_name}</h1>
          <p className="mt-1 text-sm text-subtle">
            {s.status === "completed" ? (
              <span className="text-success">Visa approved, completed</span>
            ) : (
              <>
                Stage <span className="num">{b.stage_position}</span> of <span className="num">{totalStages}</span>,{" "}
                <span className="text-text">{b.stage_name}</span>
                {" for "}
                <span className={cn("num", b.is_stuck && "font-medium text-warning")}>
                  {b.days_in_stage} {b.days_in_stage === 1 ? "day" : "days"}
                </span>
                {b.is_stuck && <span className="text-warning"> (stuck)</span>}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  s.status === "lost" && "border-danger/50 text-danger",
                  s.status === "on_hold" && "border-warning/50 text-warning",
                  s.status === "completed" && "border-success/50 text-success",
                )}
              >
                {pending && <Loader2 className="animate-spin" />}
                {labelOf(STATUSES, s.status)}
                <ChevronDown className="text-subtle" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => changeStatus("active")}>Active</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => changeStatus("on_hold")}>On hold</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => changeStatus("completed")}>Completed</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setLostOpen(true)}>
                Mark as lost…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <RouteRail
        size="md"
        total={totalStages}
        current={b.stage_position ?? 1}
        completed={s.status === "completed"}
        className="mt-5 max-w-xl"
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="grid flex-1 grid-cols-4 gap-2 sm:flex sm:flex-none">
          {contact.map((c) =>
            c.href ? (
              <Button key={c.label} variant="outline" asChild className="h-12 flex-col gap-0.5 text-xs sm:h-9 sm:flex-row sm:gap-1.5 sm:text-sm">
                <a href={c.href} target={c.external ? "_blank" : undefined} rel={c.external ? "noopener noreferrer" : undefined}>
                  <c.icon />
                  {c.label}
                </a>
              </Button>
            ) : (
              <Button
                key={c.label}
                variant="outline"
                disabled
                title={`No ${c.label === "Drive" ? "Drive folder" : c.label.toLowerCase()} saved`}
                className="h-12 flex-col gap-0.5 text-xs sm:h-9 sm:flex-row sm:gap-1.5 sm:text-sm"
              >
                <c.icon />
                {c.label}
              </Button>
            ),
          )}
        </div>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <span className="text-sm text-subtle">Counsellor</span>
          {isAdmin ? (
            <Select
              value={s.assigned_to ?? "none"}
              onValueChange={(v) =>
                start(async () => {
                  const res = await assignStudent(s.id, v === "none" ? null : v);
                  if (res.ok) toast.success("Counsellor changed");
                  else toast.error(res.error);
                })
              }
            >
              <SelectTrigger aria-label="Counsellor" className="min-w-40 flex-1 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {team.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm">{b.counsellor_name ?? "Unassigned"}</span>
          )}
        </div>
      </div>
      {s.status === "lost" && s.lost_reason && (
        <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Lost: {s.lost_reason}</p>
      )}

      <Dialog open={lostOpen} onOpenChange={setLostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {s.full_name} as lost</DialogTitle>
            <DialogDescription>They leave the pipeline but stay in Students. You can make them active again later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="lost-reason">Reason</Label>
            <Textarea
              id="lost-reason"
              placeholder="e.g. Chose another country, budget, visa rejected"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={pending || reason.trim().length < 3} onClick={() => changeStatus("lost", reason)}>
              {pending && <Loader2 className="animate-spin" />}
              Mark as lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
