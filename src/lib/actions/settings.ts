"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { emailLayout, sendEmail, siteUrl } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fail, friendlyError, type ActionResult } from "./result";

const uuid = z.uuid();
const name = (msg: string, max = 120) => z.string().trim().min(1, msg).max(max);

function settingsError(e: { message?: string; code?: string } | null) {
  const msg = e?.message ?? "";
  if (msg.includes("STAGE_IN_USE")) return "Move the students out of this stage before hiding it.";
  if (msg.includes("STEP_LOCKED")) return "This step is used by the CRM (e.g. final choice, exam, visa result). You can rename it, but not hide it or change its type.";
  if (msg.includes("at least one active admin")) return "There must always be at least one active admin.";
  if (e?.code === "23503") return "This is still used by students, so it can't be deleted. Hide or rename it instead.";
  return friendlyError(e);
}

function done(path = "/settings") {
  revalidatePath(path, "layout");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ---------------------------------------------------------------- team

const inviteSchema = z.object({
  email: z.email("Enter a valid email"),
  full_name: name("Enter their name"),
  role: z.enum(["staff", "admin"]),
});

function confirmLink(tokenHash: string, type: "invite" | "recovery") {
  return siteUrl(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=/reset-password`);
}

/*
  Creates the login and a one-time "set your password" link. The link is emailed when Resend is set up,
  and always returned so the admin can also send it on WhatsApp.
*/
export async function inviteStaff(input: z.input<typeof inviteSchema>): Promise<ActionResult<{ link: string; emailed: boolean }>> {
  await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { email, full_name, role } = parsed.data;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: email.toLowerCase(),
    options: { data: { full_name } },
  });
  if (error || !data.user) {
    return fail(error?.code === "email_exists" ? "Someone with this email is already in the team." : "Couldn't create the invite. Try again.");
  }
  await admin.from("profiles").update({ full_name, role }).eq("id", data.user.id);
  if (role === "admin") await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { role: "admin" } });

  const link = confirmLink(data.properties.hashed_token, "invite");
  const emailed = await sendEmail(
    email,
    "You're invited to SYB CRM",
    emailLayout(
      "You're invited to SYB CRM",
      `<p style="margin:0 0 16px">Hi ${full_name.split(" ")[0].replace(/[<>&"]/g, "")}, See You Abroad has added you to the team CRM.</p>
<p style="margin:0 0 16px"><a href="${link}" style="display:inline-block;background:#1a4fe0;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Set my password</a></p>
<p style="margin:0;color:#5b6475;font-size:13px">The link works once and expires in 24 hours.</p>`,
    ),
  );
  done("/settings/team");
  return { ok: true, data: { link, emailed } };
}

// A fresh "set your password" link for someone already in the team.
export async function newPasswordLink(profileId: string): Promise<ActionResult<{ link: string; emailed: boolean }>> {
  await requireAdmin();
  if (!uuid.safeParse(profileId).success) return fail("Unknown person");
  const admin = createAdminClient();
  const { data: person } = await admin.from("profiles").select("email, full_name").eq("id", profileId).single();
  if (!person?.email) return fail("This person has no email.");
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email: person.email });
  if (error) return fail("Couldn't create the link. Try again.");
  const link = confirmLink(data.properties.hashed_token, "recovery");
  const emailed = await sendEmail(
    person.email,
    "Set your SYB CRM password",
    emailLayout(
      "Set your SYB CRM password",
      `<p style="margin:0 0 16px"><a href="${link}" style="display:inline-block;background:#1a4fe0;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Choose a password</a></p>
<p style="margin:0;color:#5b6475;font-size:13px">The link works once and expires in 24 hours.</p>`,
    ),
  );
  return { ok: true, data: { link, emailed } };
}

const staffSchema = z.object({
  full_name: name("Enter their name"),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : null)),
  role: z.enum(["staff", "admin"]),
});

export async function updateStaff(id: string, input: z.input<typeof staffSchema>): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown person");
  const parsed = staffSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (id === me.id && parsed.data.role !== "admin") return fail("You can't remove your own admin role. Ask another admin.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", id);
  if (error) return fail(settingsError(error));
  await createAdminClient().auth.admin.updateUserById(id, { app_metadata: { role: parsed.data.role } });
  return done("/settings/team");
}

// Switching someone off also blocks their login immediately.
export async function setStaffActive(id: string, active: boolean): Promise<ActionResult> {
  const me = await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown person");
  if (id === me.id && !active) return fail("You can't switch off your own account.");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
  if (error) return fail(settingsError(error));
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });
  if (!active) await admin.auth.admin.signOut(id).catch(() => undefined);
  return done("/settings/team");
}

// ---------------------------------------------------------------- stages and steps

const stageSchema = z.object({
  name: name("Give the stage a name", 80),
  stuck_after_days: z.coerce.number().int().min(1, "At least 1 day").max(365),
});

export async function saveStage(id: string | null, input: z.input<typeof stageSchema>): Promise<ActionResult> {
  await requireAdmin();
  if (id && !uuid.safeParse(id).success) return fail("Unknown stage");
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("stages").update(parsed.data).eq("id", id);
    if (error) return fail(settingsError(error));
  } else {
    const { data: last } = await supabase.from("stages").select("position").eq("country", "CZ").order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("stages").insert({ ...parsed.data, country: "CZ", position: (last?.position ?? 0) + 1 });
    if (error) return fail(settingsError(error));
  }
  return done("/settings/pipeline");
}

export async function setStageActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown stage");
  const supabase = await createClient();
  const { error } = await supabase.from("stages").update({ active }).eq("id", id);
  if (error) return fail(settingsError(error));
  return done("/settings/pipeline");
}

const idList = z.array(uuid).min(1).max(200);

export async function reorder(kind: "stages" | "steps" | "document_types" | "templates", ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const parsed = idList.safeParse(ids);
  if (!parsed.success) return fail("Couldn't reorder");
  const supabase = await createClient();
  const fn = { stages: "reorder_stages", steps: "reorder_steps", document_types: "reorder_document_types", templates: "reorder_templates" } as const;
  const { error } = await supabase.rpc(fn[kind], { p_ids: parsed.data });
  if (error) return fail(settingsError(error));
  return done();
}

const stepSchema = z
  .object({
    stage_id: uuid,
    label: name("Write the step", 160),
    kind: z.enum(["tick", "yes_no", "date", "pass_fail", "text"]),
    required: z.boolean(),
    show_if_step_id: z.union([uuid, z.literal("")]).nullable().optional().transform((v) => v || null),
    show_if_value: z.enum(["yes", "no"]).nullable().optional(),
    pass_label: z.string().trim().max(40).nullable().optional().transform((v) => v || null),
    fail_label: z.string().trim().max(40).nullable().optional().transform((v) => v || null),
  })
  .transform((v) => ({ ...v, show_if_value: v.show_if_step_id ? (v.show_if_value ?? "yes") : null }));

export async function saveStep(id: string | null, input: z.input<typeof stepSchema>): Promise<ActionResult> {
  await requireAdmin();
  if (id && !uuid.safeParse(id).success) return fail("Unknown step");
  const parsed = stepSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (id && parsed.data.show_if_step_id === id) return fail("A step can't depend on itself.");
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("stage_steps").update(parsed.data).eq("id", id);
    if (error) return fail(settingsError(error));
  } else {
    const { data: last } = await supabase.from("stage_steps").select("position").eq("stage_id", parsed.data.stage_id).order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("stage_steps").insert({ ...parsed.data, position: (last?.position ?? 0) + 1 });
    if (error) return fail(settingsError(error));
  }
  return done("/settings/pipeline");
}

export async function setStepActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown step");
  const supabase = await createClient();
  const { error } = await supabase.from("stage_steps").update({ active }).eq("id", id);
  if (error) return fail(settingsError(error));
  return done("/settings/pipeline");
}

// ---------------------------------------------------------------- documents, universities, templates

const docSchema = z.object({ name: name("Name the document", 80), required: z.boolean() });

export async function saveDocumentType(id: string | null, input: z.input<typeof docSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = docSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  if (id) {
    if (!uuid.safeParse(id).success) return fail("Unknown document");
    const { error } = await supabase.from("document_types").update(parsed.data).eq("id", id);
    if (error) return fail(settingsError(error));
  } else {
    const { data: last } = await supabase.from("document_types").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("document_types").insert({ ...parsed.data, position: (last?.position ?? 0) + 1 });
    if (error) return fail(settingsError(error));
  }
  return done("/settings/documents");
}

export async function setDocumentTypeActive(id: string, active: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown document");
  const supabase = await createClient();
  const { error } = await supabase.from("document_types").update({ active }).eq("id", id);
  if (error) return fail(settingsError(error));
  if (active) {
    // Students added while it was hidden get the checklist row now.
    const admin = createAdminClient();
    const { data: students } = await admin.from("students").select("id");
    if (students?.length)
      await admin
        .from("student_documents")
        .upsert(students.map((s) => ({ student_id: s.id, document_type_id: id })), { onConflict: "student_id,document_type_id", ignoreDuplicates: true });
  }
  return done("/settings/documents");
}

const uniSchema = z.object({
  name: name("Enter the university name", 160),
  city: z.string().trim().max(80).optional().transform((v) => (v ? v : null)),
});

export async function saveUniversity(id: string | null, input: z.input<typeof uniSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = uniSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("universities").update(parsed.data).eq("id", id)
    : await supabase.from("universities").insert({ ...parsed.data, country: "CZ" });
  if (error) return fail(error.code === "23505" ? "That university is already in the list." : settingsError(error));
  return done("/settings/universities");
}

export async function deleteUniversity(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown university");
  const supabase = await createClient();
  const { error } = await supabase.from("universities").delete().eq("id", id);
  if (error) return fail(settingsError(error));
  return done("/settings/universities");
}

const templateSchema = z.object({
  name: name("Name the template", 80),
  body: z.string().trim().min(5, "Write the message").max(1000),
});

export async function saveTemplate(id: string | null, input: z.input<typeof templateSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  if (id) {
    if (!uuid.safeParse(id).success) return fail("Unknown template");
    const { error } = await supabase.from("message_templates").update(parsed.data).eq("id", id);
    if (error) return fail(settingsError(error));
  } else {
    const { data: last } = await supabase.from("message_templates").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("message_templates").insert({ ...parsed.data, position: (last?.position ?? 0) + 1 });
    if (error) return fail(settingsError(error));
  }
  return done("/settings/messages");
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return fail("Unknown template");
  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").delete().eq("id", id);
  if (error) return fail(settingsError(error));
  return done("/settings/messages");
}

export async function setDigest(enabled: boolean): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ digest_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", 1);
  if (error) return fail(settingsError(error));
  return done("/settings/general");
}
