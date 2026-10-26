"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { addDays, todayIST } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { fail, friendlyError, type ActionResult } from "./result";

const uuid = z.uuid();

const taskSchema = z.object({
  title: z.string().trim().min(2, "Describe the task").max(200),
  due_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date"),
  student_id: z.union([uuid, z.literal("")]).optional(),
  assigned_to: z.union([uuid, z.literal("")]).optional(),
});

export async function createTask(input: z.input<typeof taskSchema>): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const me = await getMe();
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: v.title,
    due_on: v.due_on,
    student_id: v.student_id || null,
    assigned_to: me.isAdmin && v.assigned_to ? v.assigned_to : me.id,
  });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Unknown task");
  const supabase = await createClient();
  const { error, count } = await supabase.from("tasks").update({ done }, { count: "exact" }).eq("id", id);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You can only change your own tasks.");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function snoozeTask(id: string, days: number): Promise<ActionResult> {
  if (!uuid.safeParse(id).success || ![1, 3, 7].includes(days)) return fail("Unknown task");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("tasks")
    .update({ due_on: addDays(todayIST(), days) }, { count: "exact" })
    .eq("id", id);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You can only change your own tasks.");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  if (!uuid.safeParse(id).success) return fail("Unknown task");
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}

// Follow-up done: log it, then either clear or set the next follow-up.
export async function completeFollowup(studentId: string, nextDate: string | null): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success) return fail("Unknown student");
  if (nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) return fail("Pick a valid date");
  const me = await getMe();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("students")
    .update({ next_followup_on: nextDate }, { count: "exact" })
    .eq("id", studentId);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this student.");
  await supabase.from("activity_log").insert({
    student_id: studentId,
    author_id: me.id,
    kind: "note",
    body: nextDate ? `Follow-up done. Next follow-up set.` : "Follow-up done.",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function snoozeFollowup(studentId: string, days: number): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success || ![1, 3, 7].includes(days)) return fail("Unknown student");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("students")
    .update({ next_followup_on: addDays(todayIST(), days) }, { count: "exact" })
    .eq("id", studentId);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this student.");
  revalidatePath("/", "layout");
  return { ok: true };
}
