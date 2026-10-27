"use client";

import { startTransition, useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { submitApplication } from "@/lib/actions/apply";
import { MONTHS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const BUDGETS = ["Under ₹6 lakh", "₹6–10 lakh", "₹10–15 lakh", "Above ₹15 lakh", "Not sure yet"];
const HEARD = [
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "A friend or family member" },
  { value: "website", label: "Google or our website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Somewhere else" },
];

function Field({
  id,
  label,
  error,
  hint,
  children,
  optional,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="font-normal text-subtle"> (optional)</span>}
      </Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export function ApplyForm({ startedAt }: { startedAt: number }) {
  const [state, action, pending] = useActionState(submitApplication, undefined);
  const [sameWa, setSameWa] = useState(true);
  const [heard, setHeard] = useState("");
  const [name, setName] = useState("");
  const fe = state?.fieldErrors ?? {};
  const year = new Date().getFullYear();
  const invalid = (k: string) => (fe[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});

  if (state?.ok) {
    return (
      <div className="py-6" role="status">
        <span className="grid size-11 place-items-center rounded-full bg-success-soft text-success">
          <Check className="size-5" />
        </span>
        <h2 className="mt-5 text-[28px] leading-tight font-semibold tracking-tight">
          Thank you{name ? `, ${name.trim().split(" ")[0]}` : ""}.
        </h2>
        <p className="mt-3 max-w-md text-base leading-relaxed text-subtle">
          A counsellor from our Kozhikode office will call you within one working day to talk about your plans for the
          Czech Republic.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-8"
      // Submitting this way keeps what people typed if a field needs fixing (a plain form action clears it).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="t" value={startedAt} />
      {/* Spam trap: hidden from people, bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset className="space-y-5">
        <legend className="mb-4 text-lg font-semibold">About you</legend>
        <Field id="full_name" label="Full name" error={fe.full_name}>
          <Input id="full_name" name="full_name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} {...invalid("full_name")} />
        </Field>
        <Field id="phone" label="Phone number" error={fe.phone}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98470 12345" {...invalid("phone")} />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <Switch name="whatsapp_same" checked={sameWa} onCheckedChange={setSameWa} />
          I use this number on WhatsApp
        </label>
        {!sameWa && (
          <Field id="whatsapp" label="WhatsApp number" error={fe.whatsapp}>
            <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" {...invalid("whatsapp")} />
          </Field>
        )}
        <Field id="email" label="Email" error={fe.email}>
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" {...invalid("email")} />
        </Field>
        <Field id="city" label="City" error={fe.city}>
          <Input id="city" name="city" autoComplete="address-level2" placeholder="e.g. Kozhikode" {...invalid("city")} />
        </Field>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-4 text-lg font-semibold">Your study plans</legend>
        <div className="space-y-2">
          <span className="text-sm font-medium">I want to study for a</span>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {[
              { v: "bachelor", l: "Bachelor's degree" },
              { v: "master", l: "Master's degree" },
            ].map((o) => (
              <label
                key={o.v}
                className={cn(
                  "flex h-12 cursor-pointer items-center justify-center rounded-lg border border-line text-sm transition-colors has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:outline-2 has-focus-visible:outline-brand",
                  fe.level && "border-danger/60",
                )}
              >
                <input type="radio" name="level" value={o.v} className="sr-only" />
                {o.l}
              </label>
            ))}
          </div>
          {fe.level && <p className="text-sm text-danger">{fe.level}</p>}
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">When do you want to start?</span>
          <div className="grid grid-cols-2 gap-2">
            <Select name="intake_month" defaultValue="9">
              <SelectTrigger aria-label="Start month" className="w-full">
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
            <Select name="intake_year" defaultValue={String(new Date().getMonth() < 6 ? year : year + 1)}>
              <SelectTrigger aria-label="Start year" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[year, year + 1, year + 2].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Field id="course_interest" label="Course you're interested in" optional hint="e.g. Computer Science, Medicine, MBA">
          <Input id="course_interest" name="course_interest" />
        </Field>
        <div className="space-y-2">
          <span className="text-sm font-medium">
            Budget for fees and living, per year <span className="font-normal text-subtle">(optional)</span>
          </span>
          <Select name="budget_range">
            <SelectTrigger aria-label="Budget" className="w-full">
              <SelectValue placeholder="Choose a range" />
            </SelectTrigger>
            <SelectContent>
              {BUDGETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium">How did you hear about us?</span>
          <Select name="heard_about" value={heard} onValueChange={setHeard}>
            <SelectTrigger aria-label="How did you hear about us?" aria-invalid={!!fe.heard_about} className="w-full">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent>
              {HEARD.map((h) => (
                <SelectItem key={h.value} value={h.value}>
                  {h.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fe.heard_about && <p className="text-sm text-danger">{fe.heard_about}</p>}
        </div>
        {heard === "referral" && (
          <Field id="referred_by" label="Who referred you?" optional>
            <Input id="referred_by" name="referred_by" />
          </Field>
        )}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-1 text-lg font-semibold">Parent or guardian</legend>
        <p className="text-sm text-subtle">Optional. Many families like us to keep a parent in the loop.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="parent_name" label="Name" optional>
            <Input id="parent_name" name="parent_name" />
          </Field>
          <Field id="parent_phone" label="Phone" optional error={fe.parent_phone}>
            <Input id="parent_phone" name="parent_phone" type="tel" inputMode="tel" {...invalid("parent_phone")} />
          </Field>
        </div>
      </fieldset>

      <div className="space-y-2">
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <Checkbox name="consent" value="on" className="mt-0.5 size-5" aria-invalid={!!fe.consent} />
          <span>
            I agree that See You Abroad may store these details and contact me by phone, WhatsApp or email about studying
            abroad. I can ask for my details to be deleted at any time.
          </span>
        </label>
        {fe.consent && <p className="text-sm text-danger">{fe.consent}</p>}
      </div>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full sm:w-auto sm:px-8" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Send my details
      </Button>
    </form>
  );
}
