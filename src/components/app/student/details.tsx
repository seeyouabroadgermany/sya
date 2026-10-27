"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addToShortlist, removeFromShortlist, setFinalChoice, updateStudentDetails } from "@/lib/actions/students";
import { LEAD_SOURCES, LEVELS, MONTHS, type LeadSource, type Level } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/lib/data";

type Student = StudentProfile["student"];
type ShortlistItem = StudentProfile["shortlist"][number];

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-subtle">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-subtle">{hint}</p>}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function DetailsTab({
  student,
  shortlist,
  universities,
}: {
  student: Student;
  shortlist: ShortlistItem[];
  universities: { id: string; name: string; city: string | null }[];
}) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    full_name: student.full_name,
    phone: student.phone ?? "",
    whatsapp: student.whatsapp ?? "",
    email: student.email ?? "",
    city: student.city ?? "",
    level: (student.level ?? "") as Level | "",
    intake_month: student.intake_month ? String(student.intake_month) : "",
    intake_year: student.intake_year ? String(student.intake_year) : "",
    course_interest: student.course_interest ?? "",
    budget_range: student.budget_range ?? "",
    lead_source: student.lead_source as LeadSource,
    referred_by: student.referred_by ?? "",
    heard_about: (student.heard_about ?? "") as LeadSource | "",
    drive_folder_url: student.drive_folder_url ?? "",
    parent_name: student.parent_name ?? "",
    parent_phone: student.parent_phone ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const thisYear = new Date().getFullYear();

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateStudentDetails(student.id, {
        ...f,
        level: f.level || null,
        heard_about: f.heard_about || null,
        intake_month: f.intake_month ? Number(f.intake_month) : null,
        intake_year: f.intake_year ? Number(f.intake_year) : null,
      });
      if (res.ok) toast.success("Details saved");
      else toast.error(res.error);
    });
  }

  return (
    <div className="space-y-10">
      <form onSubmit={save} className="space-y-8">
        <Group title="Contact">
          <Field label="Full name" htmlFor="d-name">
            <Input id="d-name" value={f.full_name} onChange={set("full_name")} required />
          </Field>
          <Field label="City" htmlFor="d-city">
            <Input id="d-city" value={f.city} onChange={set("city")} />
          </Field>
          <Field label="Phone" htmlFor="d-phone">
            <Input id="d-phone" type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} required />
          </Field>
          <Field label="WhatsApp" htmlFor="d-wa">
            <Input id="d-wa" type="tel" inputMode="tel" value={f.whatsapp} onChange={set("whatsapp")} />
          </Field>
          <Field label="Email" htmlFor="d-email">
            <Input id="d-email" type="email" inputMode="email" value={f.email} onChange={set("email")} />
          </Field>
          <Field
            label="Google Drive folder"
            htmlFor="d-drive"
            hint="Documents stay in Drive. Paste the folder link here."
          >
            <Input id="d-drive" type="url" placeholder="https://drive.google.com/…" value={f.drive_folder_url} onChange={set("drive_folder_url")} />
          </Field>
        </Group>

        <Group title="Study plan">
          <Field label="Level">
            <Select value={f.level} onValueChange={(v) => setF({ ...f, level: v as Level })}>
              <SelectTrigger className="w-full" aria-label="Level">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Intake">
            <div className="grid grid-cols-2 gap-2">
              <Select value={f.intake_month} onValueChange={(v) => setF({ ...f, intake_month: v })}>
                <SelectTrigger className="w-full" aria-label="Intake month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={f.intake_year} onValueChange={(v) => setF({ ...f, intake_year: v })}>
                <SelectTrigger className="w-full" aria-label="Intake year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Field>
          <Field label="Course interest" htmlFor="d-course">
            <Input id="d-course" value={f.course_interest} onChange={set("course_interest")} />
          </Field>
          <Field label="Budget" htmlFor="d-budget">
            <Input id="d-budget" placeholder="e.g. ₹8–12 lakh" value={f.budget_range} onChange={set("budget_range")} />
          </Field>
          <Field label="Lead source">
            <Select value={f.lead_source} onValueChange={(v) => setF({ ...f, lead_source: v as LeadSource })}>
              <SelectTrigger className="w-full" aria-label="Lead source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Referred by" htmlFor="d-ref">
            <Input id="d-ref" value={f.referred_by} onChange={set("referred_by")} />
          </Field>
          <Field label="First heard about us via">
            <Select value={f.heard_about} onValueChange={(v) => setF({ ...f, heard_about: v as LeadSource })}>
              <SelectTrigger className="w-full" aria-label="First heard about us via">
                <SelectValue placeholder="Not recorded" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Group>

        <Group title="Parent or guardian">
          <Field label="Name" htmlFor="d-pname">
            <Input id="d-pname" value={f.parent_name} onChange={set("parent_name")} />
          </Field>
          <Field label="Phone" htmlFor="d-pphone">
            <Input id="d-pphone" type="tel" inputMode="tel" value={f.parent_phone} onChange={set("parent_phone")} />
          </Field>
        </Group>

        <p className="text-xs text-subtle">Never write passport numbers here or in notes.</p>
        <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] -mx-4 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <Button type="submit" disabled={pending} className="w-full md:w-auto">
            {pending && <Loader2 className="animate-spin" />}
            Save details
          </Button>
        </div>
      </form>

      <Shortlist studentId={student.id} items={shortlist} universities={universities} />
    </div>
  );
}

function Shortlist({
  studentId,
  items,
  universities,
}: {
  studentId: string;
  items: ShortlistItem[];
  universities: { id: string; name: string; city: string | null }[];
}) {
  const [pending, start] = useTransition();
  const [uni, setUni] = useState("");
  const [course, setCourse] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else if (success) toast.success(success);
    });

  return (
    <section id="shortlist" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">University shortlist</h3>
        <p className="mt-1 text-sm text-subtle">Star the student&apos;s final choice. That ticks &quot;final choice confirmed&quot;.</p>
      </div>
      <ul className="divide-y divide-line rounded-[12px] border border-line">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 p-2 pl-3">
            <button
              type="button"
              aria-label={i.is_final ? "Final choice. Tap to unstar." : "Make this the final choice"}
              aria-pressed={i.is_final}
              disabled={pending}
              onClick={() =>
                run(() => setFinalChoice(studentId, i.is_final ? null : i.id), i.is_final ? undefined : "Final choice saved")
              }
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg text-subtle hover:bg-surface-2",
                i.is_final && "text-brand-ink",
              )}
            >
              <Star className={cn("size-4", i.is_final && "fill-current")} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{i.university?.name}</div>
              <div className="truncate text-xs text-subtle">
                {[i.course, i.university?.city].filter(Boolean).join(", ") || "No course yet"}
                {i.is_final && <span className="text-brand-ink"> (final choice)</span>}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove ${i.university?.name}`}
              disabled={pending}
              onClick={() => run(() => removeFromShortlist(studentId, i.id))}
              className="text-subtle"
            >
              <Trash2 />
            </Button>
          </li>
        ))}
        {items.length === 0 && <li className="p-4 text-sm text-subtle">No universities yet. Add the first one below.</li>}
      </ul>
      <form
        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!uni) return toast.error("Choose a university");
          run(async () => {
            const r = await addToShortlist(studentId, { university_id: uni, course });
            if (r.ok) {
              setUni("");
              setCourse("");
            }
            return r;
          });
        }}
      >
        <Select value={uni} onValueChange={setUni}>
          <SelectTrigger className="w-full" aria-label="University">
            <SelectValue placeholder="Choose university" />
          </SelectTrigger>
          <SelectContent>
            {universities.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Course (optional)" aria-label="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
        <Button type="submit" variant="outline" disabled={pending}>
          <Plus /> Add
        </Button>
      </form>
    </section>
  );
}
