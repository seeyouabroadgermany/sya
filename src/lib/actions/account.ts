"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fail, friendlyError, type ActionResult } from "./result";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  phone: z.string().trim().max(20).optional().transform((v) => (v ? v : null)),
});

export async function updateMyProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const me = await getMe();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", me.id);
  if (error) return fail(friendlyError(error));
  revalidatePath("/", "layout");
  return { ok: true };
}

const pwSchema = z
  .object({ password: z.string().min(8, "Use at least 8 characters"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match" });

export async function changeMyPassword(input: z.input<typeof pwSchema>): Promise<ActionResult> {
  await getMe();
  const parsed = pwSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(error.code === "same_password" ? "Choose a password different from your current one." : "Couldn't change the password. Try again.");
  return { ok: true };
}
