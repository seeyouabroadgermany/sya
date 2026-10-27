import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];
export type LeadSource = Enums["lead_source"];
export type Level = Enums["student_level"];
export type StudentStatus = Enums["student_status"];
export type StepKind = Enums["step_kind"];
export type ActivityKind = Enums["activity_kind"];

export const LEAD_SOURCES: { value: LeadSource; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "other", label: "Other" },
];

export const LEVELS: { value: Level; label: string }[] = [
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
];

export const STATUSES: { value: StudentStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "lost", label: "Lost" },
  { value: "completed", label: "Completed" },
];

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const labelOf = <T extends string>(list: { value: T; label: string }[], value: T | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? "";

export type PaymentKind = Enums["payment_kind"];
export type Currency = Enums["currency_code"];
export type DocStatus = Enums["doc_status"];

export const PAYMENT_KINDS: { value: PaymentKind; label: string }[] = [
  { value: "agency", label: "Agency fee" },
  { value: "university", label: "University fee" },
  { value: "nostrification", label: "Nostrification fee" },
  { value: "other", label: "Other" },
];

// Usual currency for each kind of payment; can be changed per payment.
export const DEFAULT_CURRENCY: Record<PaymentKind, Currency> = {
  agency: "INR",
  university: "CZK",
  nostrification: "CZK",
  other: "INR",
};

export const CURRENCIES: { value: Currency; label: string }[] = [
  { value: "INR", label: "₹ INR" },
  { value: "CZK", label: "Kč CZK" },
  { value: "EUR", label: "€ EUR" },
];
