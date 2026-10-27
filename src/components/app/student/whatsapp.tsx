"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { addActivity } from "@/lib/actions/students";
import { formatDate, formatMoney, whatsappLink } from "@/lib/format";
import type { StudentProfile } from "@/lib/data";

export type Template = { id: string; name: string; body: string };

const firstName = (n: string | null | undefined) => (n ?? "").replace(/\(.*?\)/g, "").trim().split(/\s+/)[0] ?? "";

// Values for {placeholders}. Missing ones stay visible as [like this] so nobody sends a blank.
function placeholderValues(profile: StudentProfile, counsellor: string) {
  const stepValue = (key: string) => {
    const step = profile.steps.find((s) => s.key === key);
    return profile.studentSteps.find((ss) => ss.step_id === step?.id)?.value ?? null;
  };
  const pending = profile.payments.find((p) => p.status === "pending");
  const examDate = stepValue("exam_date");
  const visaDate = stepValue("visa_date");
  return {
    name: firstName(profile.student.full_name),
    counsellor: firstName(profile.board.counsellor_name ?? counsellor),
    university: profile.board.final_university ?? null,
    exam_date: examDate ? formatDate(examDate) : null,
    visa_date: visaDate ? formatDate(visaDate) : null,
    amount: pending ? formatMoney(pending.amount, pending.currency) : null,
    drive_link: profile.student.drive_folder_url ?? null,
  } as Record<string, string | null>;
}

export function fillTemplate(body: string, values: Record<string, string | null>) {
  const missing: string[] = [];
  const text = body.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (!(key in values)) return match;
    const v = values[key];
    if (v) return v;
    const label = key.replace(/_/g, " ");
    missing.push(label);
    return `[${label}]`;
  });
  return { text, missing };
}

export function WhatsAppButton({
  profile,
  templates,
  myName,
  className,
}: {
  profile: StudentProfile;
  templates: Template[];
  myName: string;
  className?: string;
}) {
  const number = profile.student.whatsapp || profile.student.phone;
  const plain = whatsappLink(number);
  const values = useMemo(() => placeholderValues(profile, myName), [profile, myName]);
  const [chosen, setChosen] = useState<Template | null>(null);
  const [text, setText] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  if (!plain) {
    return (
      <Button variant="outline" disabled title="No WhatsApp number saved" className={className}>
        <MessageCircle /> WhatsApp
      </Button>
    );
  }

  function choose(t: Template) {
    const filled = fillTemplate(t.body, values);
    setText(filled.text);
    setMissing(filled.missing);
    setChosen(t);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={className}>
            <MessageCircle />
            <span>WhatsApp</span>
            <ChevronDown className="hidden text-subtle sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem asChild>
            <a href={plain} target="_blank" rel="noopener noreferrer">
              Open chat
            </a>
          </DropdownMenuItem>
          {templates.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-normal text-subtle">Send a ready message</DropdownMenuLabel>
              {templates.map((t) => (
                <DropdownMenuItem key={t.id} onSelect={() => choose(t)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!chosen} onOpenChange={(o) => !o && setChosen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{chosen?.name}</DialogTitle>
            <DialogDescription>To {profile.student.full_name}, {number}. You can change the text before sending.</DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Message" rows={6} value={text} onChange={(e) => setText(e.target.value)} />
          {missing.length > 0 && (
            <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
              Not saved for this student yet: {missing.join(", ")}. Fill in the [brackets] before sending.
            </p>
          )}
          <DialogFooter>
            <Button asChild>
              <a
                href={whatsappLink(number, text) ?? plain}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const name = chosen?.name ?? "message";
                  setChosen(null);
                  // The link opens straight away; the history note is saved alongside.
                  addActivity(profile.student.id, { kind: "whatsapp", body: `WhatsApp sent (${name}):\n${text}` }).then((r) =>
                    r.ok ? toast.success("Saved in Activity") : toast.error(r.error),
                  );
                }}
              >
                <MessageCircle /> Open in WhatsApp
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
