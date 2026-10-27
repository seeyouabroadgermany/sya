import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignmentEmail, sendEmail } from "@/lib/email";

// Email a counsellor about students just assigned to them. Never throws.
export async function notifyAssignment(profileId: string | null, studentIds: string[]) {
  if (!profileId || studentIds.length === 0) return;
  try {
    const admin = createAdminClient();
    const [{ data: person }, { data: students }] = await Promise.all([
      admin.from("profiles").select("full_name, email, active").eq("id", profileId).single(),
      admin.from("students").select("id, full_name").in("id", studentIds),
    ]);
    if (!person?.email || !person.active || !students?.length) return;
    const { subject, html } = assignmentEmail(person.full_name, students);
    await sendEmail(person.email, subject, html);
  } catch (e) {
    console.error("notifyAssignment failed", e);
  }
}
