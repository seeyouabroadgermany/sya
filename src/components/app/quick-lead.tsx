"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ChipChoice, Segmented } from "@/components/app/segmented";
import { useIsDesktop } from "@/hooks/use-media-query";
import { createLead } from "@/lib/actions/students";
import { LEAD_SOURCES, LEVELS, MONTHS, type LeadSource, type Level } from "@/lib/constants";

export type Counsellor = { id: string; full_name: string };

function nextIntake() {
  // Czech universities mostly start in September; February for some programmes.
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() < 6 ? { month: 9, year: y } : { month: 9, year: y + 1 };
}

export function QuickLeadSheet({
  open,
  onOpenChange,
  isAdmin,
  counsellors,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  counsellors: Counsellor[];
}) {
  const desktop = useIsDesktop();
  const router = useRouter();
  const [pending, start] = useTransition();
  const intake = nextIntake();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sameWa, setSameWa] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [level, setLevel] = useState<Level | null>(null);
  const [month, setMonth] = useState(String(intake.month));
  const [year, setYear] = useState(String(intake.year));
  const [source, setSource] = useState<LeadSource | null>(null);
  const [assignee, setAssignee] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2].map(String);

  function reset() {
    setName("");
    setPhone("");
    setSameWa(true);
    setWhatsapp("");
    setLevel(null);
    setSource(null);
    setAssignee("none");
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!level) return setError("Choose Bachelor's or Master's");
    if (!source) return setError("Choose where the lead came from");
    start(async () => {
      const res = await createLead({
        full_name: name,
        phone,
        whatsapp: sameWa ? undefined : whatsapp,
        level,
        intake_month: Number(month),
        intake_year: Number(year),
        lead_source: source,
        assigned_to: assignee === "none" ? "" : assignee,
      });
      if (!res.ok) return setError(res.error);
      const id = res.data!.id;
      toast.success(`${name.trim()} added to Lead / Counselling`, {
        action: { label: "Open", onClick: () => router.push(`/students/${id}`) },
      });
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={desktop ? "w-full sm:max-w-md" : "max-h-[92dvh] rounded-t-2xl"}
      >
        <SheetHeader className="px-5 pt-5">
          <SheetTitle className="text-xl">New lead</SheetTitle>
          <SheetDescription>For walk-ins, calls and Instagram messages.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-4">
            <div className="space-y-2">
              <Label htmlFor="ql-name">Student name</Label>
              <Input id="ql-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ql-phone">Phone</Label>
              <Input
                id="ql-phone"
                type="tel"
                inputMode="tel"
                placeholder="+91 98470 12345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <label className="flex items-center gap-2 pt-1 text-sm text-subtle">
                <Switch checked={sameWa} onCheckedChange={setSameWa} />
                WhatsApp is the same number
              </label>
              {!sameWa && (
                <Input
                  aria-label="WhatsApp number"
                  type="tel"
                  inputMode="tel"
                  placeholder="WhatsApp number"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Segmented name="Level" options={LEVELS} value={level} onChange={setLevel} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>Intake</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger aria-label="Intake month" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger aria-label="Intake year" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>How did they find us?</Label>
              <ChipChoice name="Lead source" options={LEAD_SOURCES} value={source} onChange={setSource} />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>Counsellor</Label>
                <Select value={assignee} onValueChange={setAssignee}>
                  <SelectTrigger aria-label="Counsellor" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Decide later (goes to new leads)</SelectItem>
                    {counsellors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
          <div className="border-t border-line px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Add lead
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
