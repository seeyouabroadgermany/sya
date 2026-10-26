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
