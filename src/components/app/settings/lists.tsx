"use client";

import { startTransition, useOptimistic, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, EyeOff, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteTemplate,
  deleteUniversity,
  reorder,
  saveDocumentType,
  saveTemplate,
  saveUniversity,
  setDigest,
  setDocumentTypeActive,
} from "@/lib/actions/settings";
import { setRoundRobin } from "@/lib/actions/leads";
import { cn } from "@/lib/utils";
import { InlineText } from "./inline-text";
import { SettingsSection } from "./section";

type Res = { ok: boolean; error?: string };
function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<Res>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else if (success) toast.success(success);
    });
  return { pending, run };
}
const moveIds = <T extends { id: string }>(list: T[], i: number, dir: -1 | 1) => {
  const next = [...list];
  const [x] = next.splice(i, 1);
  next.splice(i + dir, 0, x);
  return next.map((n) => n.id);
};

// ---------------------------------------------------------------- documents

type DocType = { id: string; name: string; required: boolean; active: boolean; position: number };

export function DocumentSettings({ docs }: { docs: DocType[] }) {
  const { pending, run } = useRun();
  const [name, setName] = useState("");
  const shown = docs.filter((d) => d.active);
  const hidden = docs.filter((d) => !d.active);
  return (
    <SettingsSection
      title="Document checklist"
      description="What each student needs to hand in. Files stay in Google Drive; this is the tick list."
    >
      <ul className="divide-y divide-line rounded-[12px] border border-line">
        {shown.map((d, i) => (
          <li key={d.id} className="flex flex-wrap items-center gap-2 p-2 pl-3">
            <InlineText label="Document name" value={d.name} onSave={(v) => saveDocumentType(d.id, { name: v, required: d.required })} className="min-w-40 flex-1" />
            <label className="flex items-center gap-2 text-xs text-subtle">
              <Switch checked={d.required} disabled={pending} onCheckedChange={(v) => run(() => saveDocumentType(d.id, { name: d.name, required: v }), v ? "Now required" : "Now optional")} />
              Required
            </label>
            <Button variant="ghost" size="icon" aria-label={`Move ${d.name} up`} disabled={i === 0 || pending} onClick={() => run(() => reorder("document_types", [...moveIds(shown, i, -1), ...hidden.map((h) => h.id)]))}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Move ${d.name} down`} disabled={i === shown.length - 1 || pending} onClick={() => run(() => reorder("document_types", [...moveIds(shown, i, 1), ...hidden.map((h) => h.id)]))}>
              <ArrowDown />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Hide ${d.name}`} disabled={pending} onClick={() => run(() => setDocumentTypeActive(d.id, false), `${d.name} hidden`)}>
              <EyeOff />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await saveDocumentType(null, { name, required: true });
            if (r.ok) setName("");
            return r;
          }, "Added to every student's checklist");
        }}
      >
        <Input placeholder="e.g. IELTS score sheet" aria-label="New document" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="outline" disabled={pending || !name.trim()}>
          <Plus /> Add
        </Button>
      </form>
      {hidden.length > 0 && (
        <div className="space-y-1">
          {hidden.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-1.5 text-sm">
              <span className="flex-1 text-subtle">{d.name} (hidden)</span>
              <Button variant="ghost" size="sm" onClick={() => run(() => setDocumentTypeActive(d.id, true), `${d.name} shown again`)}>
                <RotateCcw /> Show again
              </Button>
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}

// ---------------------------------------------------------------- universities

type Uni = { id: string; name: string; city: string | null; students: number };

export function UniversitySettings({ universities }: { universities: Uni[] }) {
  const { pending, run } = useRun();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  return (
    <SettingsSection title="Universities" description="The list counsellors pick from when building a student's shortlist.">
      <ul className="divide-y divide-line rounded-[12px] border border-line">
        {universities.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-2 p-2 pl-3">
            <InlineText label="University name" value={u.name} onSave={(v) => saveUniversity(u.id, { name: v, city: u.city ?? "" })} className="min-w-48 flex-[2]" />
            <InlineText label={`City of ${u.name}`} value={u.city ?? ""} onSave={(v) => saveUniversity(u.id, { name: u.name, city: v })} className="min-w-28 flex-1" />
            <span className="num w-24 text-right text-xs text-subtle">{u.students} on shortlists</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${u.name}`}
              disabled={pending || u.students > 0}
              title={u.students > 0 ? "Used on shortlists, so it can't be deleted" : undefined}
              onClick={() => run(() => deleteUniversity(u.id), `${u.name} deleted`)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
        {universities.length === 0 && <li className="p-4 text-sm text-subtle">No universities yet. Add the first below.</li>}
      </ul>
      <form
        className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await saveUniversity(null, { name, city });
            if (r.ok) {
              setName("");
              setCity("");
            }
            return r;
          }, "University added");
        }}
      >
        <Input placeholder="University name" aria-label="New university name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="City" aria-label="New university city" value={city} onChange={(e) => setCity(e.target.value)} />
        <Button type="submit" variant="outline" disabled={pending || !name.trim()}>
          <Plus /> Add
        </Button>
      </form>
    </SettingsSection>
  );
}

// ---------------------------------------------------------------- WhatsApp templates

type Template = { id: string; name: string; body: string };

export const PLACEHOLDERS = [
  ["{name}", "Student's first name"],
  ["{counsellor}", "Counsellor's first name"],
  ["{university}", "Final university"],
  ["{exam_date}", "Entrance exam date"],
  ["{visa_date}", "Visa appointment date"],
  ["{amount}", "Pending payment amount"],
  ["{drive_link}", "Student's Drive folder"],
] as const;

export function TemplateSettings({ templates }: { templates: Template[] }) {
  const { pending, run } = useRun();
  const [edit, setEdit] = useState<Template | "new" | null>(null);
  return (
    <SettingsSection
      title="WhatsApp messages"
      description="Ready-made messages counsellors can send from a student's page. Words in {braces} are filled in automatically."
      action={
        <Button onClick={() => setEdit("new")}>
          <Plus /> New message
        </Button>
      }
    >
      <ul className="space-y-2">
        {templates.map((t, i) => (
          <li key={t.id} className="rounded-[12px] border border-line p-3">
            <div className="flex items-center gap-1">
              <p className="flex-1 text-sm font-medium">{t.name}</p>
              <Button variant="ghost" size="icon" aria-label={`Move ${t.name} up`} disabled={i === 0 || pending} onClick={() => run(() => reorder("templates", moveIds(templates, i, -1)))}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Move ${t.name} down`} disabled={i === templates.length - 1 || pending} onClick={() => run(() => reorder("templates", moveIds(templates, i, 1)))}>
                <ArrowDown />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Edit ${t.name}`} onClick={() => setEdit(t)}>
                <Pencil />
              </Button>
              <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} disabled={pending} onClick={() => run(() => deleteTemplate(t.id), "Message deleted")}>
                <Trash2 />
              </Button>
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap text-subtle">{t.body}</p>
          </li>
        ))}
        {templates.length === 0 && <li className="text-sm text-subtle">No messages yet.</li>}
      </ul>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>{edit && <TemplateForm initial={edit === "new" ? null : edit} onDone={() => setEdit(null)} />}</DialogContent>
      </Dialog>
    </SettingsSection>
  );
}

function TemplateForm({ initial, onDone }: { initial: Template | null; onDone: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveTemplate(initial?.id ?? null, { name, body });
          if (res.ok) {
            toast.success("Message saved");
            onDone();
          } else toast.error(res.error);
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{initial ? "Edit message" : "New message"}</DialogTitle>
        <DialogDescription>Tap a word below to add it to the message.</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="tpl-name">Name</Label>
          <Input id="tpl-name" placeholder="e.g. Document reminder" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tpl-body">Message</Label>
          <Textarea id="tpl-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map(([p, help]) => (
              <button key={p} type="button" title={help} onClick={() => setBody((b) => `${b}${b && !b.endsWith(" ") ? " " : ""}${p}`)}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-subtle hover:border-text/40 hover:text-text">
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Save message
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------------------------------------------------------------- general

function SwitchRow({ title, help, checked, onChange }: { title: string; help: React.ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-4 p-4">
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-sm text-subtle">{help}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-1" />
    </label>
  );
}

export function GeneralSettings({ roundRobin, digest, applyUrl }: { roundRobin: boolean; digest: boolean; applyUrl: string }) {
  const [rr, setRr] = useOptimistic(roundRobin);
  const [dg, setDg] = useOptimistic(digest);
  const toggle = (set: (v: boolean) => void, fn: (v: boolean) => Promise<Res>, v: boolean, msg: string) =>
    startTransition(async () => {
      set(v);
      const res = await fn(v);
      if (res.ok) toast.success(msg);
      else toast.error(res.error);
    });
  return (
    <SettingsSection title="Leads and emails">
      <div className={cn("divide-y divide-line rounded-[12px] border border-line")}>
        <SwitchRow
          title="Auto-assign website leads"
          help={<>New enquiries from <span className="text-text">{applyUrl}</span> go to counsellors in turn. When off, they wait in New leads for you.</>}
          checked={rr}
          onChange={(v) => toggle(setRr, setRoundRobin, v, v ? "Website leads now go to counsellors in turn" : "Website leads now wait for you")}
        />
        <SwitchRow
          title="Daily email at 8:00 am"
          help="Each counsellor gets their overdue and today's follow-ups, tasks and stuck students. Admins get a team summary. Needs email set up (see README)."
          checked={dg}
          onChange={(v) => toggle(setDg, setDigest, v, v ? "Daily email switched on" : "Daily email switched off")}
        />
      </div>
    </SettingsSection>
  );
}
