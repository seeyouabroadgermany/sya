"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAssignment } from "@/lib/notify";

export type ApplyState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

const phone = z
  .string()
  .trim()
  .min(8, "Enter your phone number with country code")
  .max(20)
  .regex(/^[+\d][\d\s-]+$/, "Use digits only, e.g. +91 98470 12345");
const optional = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const schema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name").max(120),
    phone,
    whatsapp_same: z.literal("on").optional(),
    whatsapp: optional(20),
    email: z.email("Enter a valid email"),
    city: z.string().trim().min(2, "Enter your city").max(80),
    level: z.enum(["bachelor", "master"], "Choose Bachelor's or Master's"),
    intake_month: z.coerce.number().int().min(1).max(12),
    intake_year: z.coerce.number().int().min(2025).max(2100),
    course_interest: optional(160),
    budget_range: optional(60),
    heard_about: z.enum(["instagram", "referral", "walk_in", "website", "whatsapp", "other"], "Tell us how you heard about us"),
    referred_by: optional(120),
    parent_name: optional(120),
    parent_phone: optional(20),
    consent: z.literal("on", "Please tick the consent box so we can contact you"),
  })
  .refine((v) => v.whatsapp_same === "on" || (v.whatsapp && /^[+\d][\d\s-]{6,}$/.test(v.whatsapp)), {
    message: "Enter your WhatsApp number",
    path: ["whatsapp"],
  })
  .refine((v) => !v.parent_phone || /^[+\d][\d\s-]{6,}$/.test(v.parent_phone), {
    message: "Use digits only for the parent's phone",
    path: ["parent_phone"],
  });

async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(ip + (process.env.SUPABASE_SECRET_KEY ?? ""))
    .digest("hex");
}

// Public enquiry form. Runs on the server with the secret key; visitors never touch the database directly.
export async function submitApplication(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  // Spam traps: a hidden field people never fill, and forms submitted faster than a human could.
  if (formData.get("company")) return { ok: true };
  const started = Number(formData.get("t"));
  if (!started || Date.now() - started < 3000) return { ok: true };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors };
  }
  const v = parsed.data;
  const admin = createAdminClient();

  const { data: limited } = await admin.rpc("lead_rate_limit_hit", { p_ip_hash: await clientIpHash() });
  if (limited) return { error: "We've received several enquiries from this connection. Please try again in an hour or message us on WhatsApp." };

  const { data: settings } = await admin.from("app_settings").select("round_robin_enabled").eq("id", 1).single();
  let assignee: string | null = null;
  if (settings?.round_robin_enabled) {
    const { data } = await admin.rpc("pick_round_robin");
    assignee = data ?? null;
  }

  const { data: student, error } = await admin
    .from("students")
    .insert({
      full_name: v.full_name,
      phone: v.phone,
      whatsapp: v.whatsapp_same === "on" ? v.phone : v.whatsapp,
      email: v.email.toLowerCase(),
      city: v.city,
      level: v.level,
      intake_month: v.intake_month,
      intake_year: v.intake_year,
      course_interest: v.course_interest,
      budget_range: v.budget_range,
      lead_source: "website",
      heard_about: v.heard_about,
      referred_by: v.referred_by,
      parent_name: v.parent_name,
      parent_phone: v.parent_phone,
      consent_at: new Date().toISOString(),
      assigned_to: assignee,
    })
    .select("id")
    .single();
  if (error || !student) {
    console.error("apply insert failed", error);
    return { error: "Something went wrong sending your details. Please try again, or message us on WhatsApp." };
  }
  if (assignee) await notifyAssignment(assignee, [student.id]);
  return { ok: true };
}
