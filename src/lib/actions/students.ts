"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { notifyAssignment } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import { fail, friendlyError, type ActionResult } from "./result";

const uuid = z.uuid();
const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : null));
const phone = z
  .string()
  .trim()
  .min(7, "Enter a phone number")
  .max(20)
  .regex(/^[+\d][\d\s-]+$/, "Use digits only, e.g. +91 98470 12345");
const optionalPhone = z
  .string()
  .trim()
  .max(20)
  .regex(/^([+\d][\d\s-]+)?$/, "Use digits only, e.g. +91 98470 12345")
  .optional()
  .transform((v) => (v ? v : null));
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

const leadSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the student's name").max(120),
  phone,
  whatsapp: optionalPhone,
  level: z.enum(["bachelor", "master"], "Choose Bachelor's or Master's"),
  intake_month: z.coerce.number().int().min(1).max(12),
  intake_year: z.coerce.number().int().min(2024).max(2100),
  lead_source: z.enum(["instagram", "referral", "walk_in", "website", "whatsapp", "other"]),
  assigned_to: z.union([uuid, z.literal("")]).optional(),
});

export async function createLead(input: z.input<typeof leadSchema>): Promise<ActionResult<{ id: string }>> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const me = await getMe();
  const v = parsed.data;

  // Staff can only own their own leads (RLS enforces this too). Admin may leave it unassigned.
  const assignedTo = me.isAdmin ? v.assigned_to || null : me.id;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      full_name: v.full_name,
      phone: v.phone,
      whatsapp: v.whatsapp ?? v.phone,
      level: v.level,
      intake_month: v.intake_month,
      intake_year: v.intake_year,
      lead_source: v.lead_source,
      assigned_to: assignedTo,
      next_followup_on: null,
    })
    .select("id")
    .single();
  if (error) return fail(friendlyError(error));
  if (me.isAdmin && assignedTo) await notifyAssignment(assignedTo, [data.id]);
  revalidatePath("/", "layout");
  return { ok: true, data: { id: data.id } };
}

const detailsSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the student's name").max(120),
  phone,
  whatsapp: optionalPhone,
  email: z
    .union([z.email("Enter a valid email"), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  city: optionalText,
  level: z.enum(["bachelor", "master"]).nullable(),
  intake_month: z.coerce.number().int().min(1).max(12).nullable(),
  intake_year: z.coerce.number().int().min(2024).max(2100).nullable(),
  course_interest: optionalText,
  budget_range: optionalText,
  lead_source: z.enum(["instagram", "referral", "walk_in", "website", "whatsapp", "other"]),
  referred_by: optionalText,
  heard_about: z.enum(["instagram", "referral", "walk_in", "website", "whatsapp", "other"]).nullable().optional(),
  drive_folder_url: z
    .union([z.url({ protocol: /^https$/, message: "Paste the full Drive link (https://…)" }), z.literal("")])
    .optional()
    .transform((v) => (v ? v : null)),
  parent_name: optionalText,
  parent_phone: optionalPhone,
});

export async function updateStudentDetails(
  id: string,
  input: z.input<typeof detailsSchema>,
): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Unknown student");
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error, count } = await supabase.from("students").update(parsed.data, { count: "exact" }).eq("id", id);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this student.");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setFollowup(id: string, date: string | null): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Unknown student");
  if (date !== null && !isoDate.safeParse(date).success) return fail("Pick a valid date");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("students")
    .update({ next_followup_on: date }, { count: "exact" })
    .eq("id", id);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this student.");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function assignStudent(id: string, profileId: string | null): Promise<ActionResult> {
  const me = await getMe();
  if (!me.isAdmin) return fail("Only an admin can reassign a student.");
  if (!uuid.safeParse(id).success || (profileId && !uuid.safeParse(profileId).success)) return fail("Unknown person");
  const supabase = await createClient();
  const { error } = await supabase.from("students").update({ assigned_to: profileId }).eq("id", id);
  if (error) return fail(friendlyError(error));
  await notifyAssignment(profileId, [id]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function moveStage(id: string, stageId: string, overrideNote?: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success || !uuid.safeParse(stageId).success) return fail("Unknown stage");
  const note = overrideNote?.trim() || null;
  const supabase = await createClient();

  const { error } = await supabase.rpc("move_student_stage", {
    p_student: id,
    p_stage: stageId,
    p_note: note ?? undefined,
  });
  if (error) {
    if (error.message.includes("STAGE_GATE")) {
      const { data: missing } = await supabase.rpc("stage_gate_missing", {
        p_student: id,
        p_target_stage: stageId,
      });
      return fail("Finish the required steps first.", { missing: missing ?? [] });
    }
    return fail(friendlyError(error));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

const statusSchema = z.object({
  status: z.enum(["active", "on_hold", "lost", "completed"]),
  reason: z.string().trim().max(300).optional(),
});

export async function setStatus(id: string, input: z.input<typeof statusSchema>): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Unknown student");
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a status");
  if (parsed.data.status === "lost" && !parsed.data.reason) return fail("Add a short reason so the team knows why.");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("students")
    .update(
      { status: parsed.data.status, lost_reason: parsed.data.status === "lost" ? parsed.data.reason : null },
      { count: "exact" },
    )
    .eq("id", id);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this student.");
  revalidatePath("/", "layout");
  return { ok: true };
}

const stepSchema = z.object({
  done: z.boolean(),
  value: z.string().trim().max(500).nullable(),
});

export async function updateStep(
  studentId: string,
  stepId: string,
  input: z.input<typeof stepSchema>,
): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success || !uuid.safeParse(stepId).success) return fail("Unknown step");
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return fail("That value isn't allowed");
  const supabase = await createClient();

  const { data: step } = await supabase.from("stage_steps").select("kind, key").eq("id", stepId).single();
  if (!step) return fail("Unknown step");
  const { done, value } = parsed.data;
  if (step.kind === "yes_no" && value !== null && !["yes", "no"].includes(value)) return fail("Choose yes or no");
  if (step.kind === "pass_fail" && value !== null && !["pass", "fail"].includes(value)) return fail("Choose a result");
  if (step.kind === "date" && value !== null && !isoDate.safeParse(value).success) return fail("Pick a valid date");
  if (step.key === "final_choice") return fail("Star a university as the final choice in Details to tick this.");

  const { error, count } = await supabase
    .from("student_steps")
    .update({ done, value }, { count: "exact" })
    .eq("student_id", studentId)
    .eq("step_id", stepId);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this student.");
  revalidatePath("/", "layout");
  return { ok: true };
}

const noteSchema = z.object({
  kind: z.enum(["note", "call", "whatsapp", "email"]),
  body: z.string().trim().min(1, "Write something first").max(4000),
});

export async function addActivity(studentId: string, input: z.input<typeof noteSchema>): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success) return fail("Unknown student");
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const me = await getMe();
  const supabase = await createClient();
  const { error } = await supabase
    .from("activity_log")
    .insert({ student_id: studentId, author_id: me.id, kind: parsed.data.kind, body: parsed.data.body });
  if (error) return fail(friendlyError(error));
  revalidatePath(`/students/${studentId}`);
  return { ok: true };
}

const shortlistSchema = z.object({
  university_id: uuid,
  course: optionalText,
});

export async function addToShortlist(studentId: string, input: z.input<typeof shortlistSchema>): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success) return fail("Unknown student");
  const parsed = shortlistSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a university");
  const supabase = await createClient();
  const { error } = await supabase.from("shortlist").insert({ student_id: studentId, ...parsed.data });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setFinalChoice(studentId: string, shortlistId: string | null): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success) return fail("Unknown student");
  const supabase = await createClient();
  // Clear the old final first (only one allowed), then star the new one.
  const { error: clearError } = await supabase
    .from("shortlist")
    .update({ is_final: false })
    .eq("student_id", studentId)
    .eq("is_final", true);
  if (clearError) return fail(friendlyError(clearError));
  if (shortlistId) {
    const { error } = await supabase
      .from("shortlist")
      .update({ is_final: true })
      .eq("id", shortlistId)
      .eq("student_id", studentId);
    if (error) return fail(friendlyError(error));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeFromShortlist(studentId: string, shortlistId: string): Promise<ActionResult> {
  if (!uuid.safeParse(shortlistId).success) return fail("Unknown entry");
  const supabase = await createClient();
  const { error } = await supabase.from("shortlist").delete().eq("id", shortlistId).eq("student_id", studentId);
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}
