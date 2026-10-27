"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, friendlyError, type ActionResult } from "./result";

const uuid = z.uuid();

export async function setDocumentStatus(
  studentId: string,
  documentTypeId: string,
  status: "pending" | "received" | "verified",
): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success || !uuid.safeParse(documentTypeId).success) return fail("Unknown document");
  if (!["pending", "received", "verified"].includes(status)) return fail("Unknown status");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("student_documents")
    .update({ status }, { count: "exact" })
    .eq("student_id", studentId)
    .eq("document_type_id", documentTypeId);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this student.");
  revalidatePath("/", "layout");
  return { ok: true };
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()
  .transform((v) => v ?? null);

const paymentSchema = z.object({
  kind: z.enum(["agency", "university", "nostrification", "other"], "Choose what the payment is for"),
  amount: z.coerce.number("Enter the amount").positive("Enter an amount above zero").max(100_000_000),
  currency: z.enum(["INR", "CZK", "EUR"]),
  status: z.enum(["pending", "paid"]),
  due_date: isoDate,
  paid_on: isoDate,
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function savePayment(
  studentId: string,
  paymentId: string | null,
  input: z.input<typeof paymentSchema>,
): Promise<ActionResult> {
  if (!uuid.safeParse(studentId).success || (paymentId && !uuid.safeParse(paymentId).success)) return fail("Unknown payment");
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const me = await getMe();
  const supabase = await createClient();
  const { error } = paymentId
    ? await supabase.from("payments").update(parsed.data).eq("id", paymentId).eq("student_id", studentId)
    : await supabase.from("payments").insert({ ...parsed.data, student_id: studentId, created_by: me.id });
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setPaymentStatus(paymentId: string, status: "pending" | "paid"): Promise<ActionResult> {
  if (!uuid.safeParse(paymentId).success || !["pending", "paid"].includes(status)) return fail("Unknown payment");
  const supabase = await createClient();
  const { error, count } = await supabase.from("payments").update({ status }, { count: "exact" }).eq("id", paymentId);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this payment.");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePayment(paymentId: string): Promise<ActionResult> {
  if (!uuid.safeParse(paymentId).success) return fail("Unknown payment");
  const supabase = await createClient();
  const { error, count } = await supabase.from("payments").delete({ count: "exact" }).eq("id", paymentId);
  if (error) return fail(friendlyError(error));
  if (!count) return fail("You don't have access to this payment.");
  revalidatePath("/", "layout");
  return { ok: true };
}
