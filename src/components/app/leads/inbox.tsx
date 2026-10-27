"use client";

import { startTransition, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Copy, Mail, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { assignMany, deleteLeads, setRoundRobin } from "@/lib/actions/leads";
import { LEAD_SOURCES, LEVELS, labelOf, type LeadSource } from "@/lib/constants";
import { formatDateTime, intakeLabel, telLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InboxLead } from "@/lib/data";

type Person = { id: string; full_name: string };

function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return formatDateTime(iso);
}

export function RoundRobinSwitch({ enabled }: { enabled: boolean }) {
  const [on, setOn] = useOptimistic(enabled);
  return (
    <label className="flex items-center gap-3 rounded-lg border border-line px-3 py-2 text-sm">
      <Switch
        checked={on}
        onCheckedChange={(v) =>
          startTransition(async () => {
            setOn(v);
            const res = await setRoundRobin(v);
            if (res.ok) toast.success(v ? "Website leads now go to counsellors in turn" : "Website leads now wait here for you");
            else toast.error(res.error);
          })
        }
      />
      <span>
        <span className="block font-medium">Auto-assign website leads</span>
        <span className="block text-xs text-subtle">Shares them among counsellors in turn</span>
      </span>
    </label>
  );
}

export function LeadInbox({ leads, team, applyUrl }: { leads: InboxLead[]; team: Person[]; applyUrl: string }) {
  const [gone, hide] = useOptimistic<Set<string>, string[]>(new Set(), (s, ids) => new Set([...s, ...ids]));
  const visible = leads.filter((l) => !gone.has(l.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTo, setBulkTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [pending, start] = useTransition();
  const sel = [...selected].filter((id) => visible.some((l) => l.id === id));

  function assign(ids: string[], to: string) {
    const person = team.find((t) => t.id === to);
    start(async () => {
      hide(ids);
      const res = await assignMany(ids, to);
      if (res.ok) {
        toast.success(`${ids.length === 1 ? "Lead" : `${ids.length} leads`} assigned to ${person?.full_name}`);
        setSelected(new Set());
        setBulkTo("");
      } else toast.error(res.error);
    });
  }

  function remove(ids: string[]) {
    start(async () => {
      hide(ids);
      const res = await deleteLeads(ids);
      if (res.ok) {
        toast.success(ids.length === 1 ? "Lead deleted" : `${ids.length} leads deleted`);
        setSelected(new Set());
      } else toast.error(res.error);
    });
  }

  if (visible.length === 0) {
    return (
      <div className="mx-4 rounded-[12px] border border-dashed border-line px-6 py-14 text-center md:mx-6">
        <p className="font-medium">No new leads waiting</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-subtle">
          Enquiries from the website form land here until you give them to a counsellor. Share the form in your Instagram
          bio or on WhatsApp:
        </p>
        <div className="mx-auto mt-4 flex max-w-md items-center gap-2 rounded-lg border border-line bg-surface p-1 pl-3">
          <code className="min-w-0 flex-1 truncate text-left text-sm">{applyUrl}</code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(applyUrl).then(() => toast.success("Link copied"))}
          >
            <Copy /> Copy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 md:px-6">
      <div className="mb-3 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-subtle">
          <Checkbox
            className="size-5"
            checked={sel.length === visible.length ? true : sel.length ? "indeterminate" : false}
            onCheckedChange={(c) => setSelected(c === true ? new Set(visible.map((l) => l.id)) : new Set())}
            aria-label="Select all leads"
          />
          Select all
        </label>
      </div>

      <ul className="space-y-3">
        {visible.map((l) => {
          const checked = selected.has(l.id);
          const tel = telLink(l.phone);
          return (
            <li
              key={l.id}
              className={cn("rounded-[12px] border border-line bg-surface p-4", checked && "border-brand/50 bg-brand-soft")}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  className="mt-1 size-5"
                  checked={checked}
                  aria-label={`Select ${l.full_name}`}
                  onCheckedChange={(c) =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (c === true) n.add(l.id);
                      else n.delete(l.id);
                      return n;
                    })
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Link href={`/students/${l.id}`} className="text-base font-semibold hover:underline">
                      {l.full_name}
                    </Link>
                    <span className="text-xs text-subtle">{ago(l.created_at)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {tel ? (
                      <a href={tel} className="inline-flex items-center gap-1.5 text-text hover:underline">
                        <Phone className="size-3.5 text-subtle" /> {l.phone}
                      </a>
                    ) : null}
                    {l.email && (
                      <a href={`mailto:${l.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:underline">
                        <Mail className="size-3.5 shrink-0 text-subtle" /> <span className="truncate">{l.email}</span>
                      </a>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <Info label="Level" value={labelOf(LEVELS, l.level)} />
                    <Info label="Intake" value={intakeLabel(l.intake_month, l.intake_year)} />
                    <Info label="City" value={l.city} />
                    <Info
                      label="Came from"
                      value={
                        l.lead_source === "website"
                          ? `Website${l.heard_about ? `, via ${labelOf(LEAD_SOURCES, l.heard_about as LeadSource)}` : ""}`
                          : labelOf(LEAD_SOURCES, l.lead_source as LeadSource)
                      }
                    />
                    {l.course_interest && <Info label="Course" value={l.course_interest} />}
                    {l.budget_range && <Info label="Budget" value={l.budget_range} />}
                    {l.referred_by && <Info label="Referred by" value={l.referred_by} />}
                    {l.parent_name && <Info label="Parent" value={l.parent_name} />}
                  </dl>
                  {l.duplicates.length > 0 && (
                    <p className="mt-3 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Same phone as{" "}
                        {l.duplicates.map((d, i) => (
                          <span key={d.id}>
                            {i > 0 && ", "}
                            <Link href={`/students/${d.id}`} className="font-medium underline">
                              {d.full_name}
                            </Link>
                            {d.counsellor ? ` (${d.counsellor})` : ""}
                          </span>
                        ))}
                        . Check before assigning.
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-line pt-3 sm:pl-8">
                <Select onValueChange={(to) => assign([l.id], to)} disabled={pending}>
                  <SelectTrigger aria-label={`Assign ${l.full_name}`} className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                    <SelectValue placeholder="Assign to…" />
                  </SelectTrigger>
                  <SelectContent>
                    {team.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" aria-label={`Delete ${l.full_name}`} className="text-subtle" onClick={() => setConfirmDelete([l.id])}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {sel.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-[232px] md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-sm font-medium">{sel.length} selected</span>
            <Select value={bulkTo} onValueChange={setBulkTo}>
              <SelectTrigger aria-label="Assign selected to" className="min-w-40 flex-1 sm:flex-none">
                <SelectValue placeholder="Assign to…" />
              </SelectTrigger>
              <SelectContent>
                {team.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!bulkTo || pending} onClick={() => assign(sel, bulkTo)}>
              Assign
            </Button>
            <Button variant="ghost" className="text-subtle" onClick={() => setConfirmDelete(sel)}>
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.length === 1 ? "this lead" : `${confirmDelete?.length} leads`}?</AlertDialogTitle>
            <AlertDialogDescription>
              Use this for spam and test enquiries. It can&apos;t be undone. For real students who aren&apos;t going ahead,
              open them and mark them as lost instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger text-white hover:bg-danger/90"
              onClick={() => {
                remove(confirmDelete!);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
