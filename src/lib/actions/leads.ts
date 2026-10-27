"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { notifyAssignment } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";
import { fail, friendlyError, type ActionResult } from "./result";

const ids = z.array(z.uuid()).min(1, "Select at least one student").max(500);

// Admin assigns one or many students to a counsellor (or unassigns). The counsellor gets one email.
export async function assignMany(studentIds: string[], profileId: string | null): Promise<ActionResult<{ count: number }>> {
  const me = await getMe();
  if (!me.isAdmin) return fail("Only an admin can assign students.");
  const parsedIds = ids.safeParse(studentIds);
  if (!parsedIds.success) return fail(parsedIds.error.issues[0].message);
  if (profileId && !z.uuid().safeParse(profileId).success) return fail("Unknown counsellor");

  const supabase = await createClient();
  // Only rows whose counsellor actually changes, so nobody is emailed twice.
  let query = supabase.from("students").update({ assigned_to: profileId }, { count: "exact" }).in("id", parsedIds.data);
  query = profileId ? query.or(`assigned_to.is.null,assigned_to.neq.${profileId}`) : query.not("assigned_to", "is", null);
  const { error, count, data } = await query.select("id");
  if (error) return fail(friendlyError(error));
  await notifyAssignment(profileId, (data ?? []).map((r) => r.id));
  revalidatePath("/", "layout");
  return { ok: true, data: { count: count ?? 0 } };
}

// Spam or test enquiries from the website. Real students should be marked lost instead.
export async function deleteLeads(studentIds: string[]): Promise<ActionResult> {
  const me = await getMe();
  if (!me.isAdmin) return fail("Only an admin can delete leads.");
  const parsedIds = ids.safeParse(studentIds);
  if (!parsedIds.success) return fail(parsedIds.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().in("id", parsedIds.data).is("assigned_to", null);
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setRoundRobin(enabled: boolean): Promise<ActionResult> {
  const me = await getMe();
  if (!me.isAdmin) return fail("Only an admin can change this.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ round_robin_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) return fail(friendlyError(error));
  revalidatePath("/leads");
  return { ok: true };
}
