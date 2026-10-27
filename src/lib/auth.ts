import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Me = {
  id: string;
  fullName: string;
  email: string | null;
  role: "admin" | "staff";
  isAdmin: boolean;
};

// The logged-in team member. Cached per request.
export const getMe = cache(async (): Promise<Me> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect("/login");

  const [{ data: profile, error }, { data: codeNeeded }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, role, active").eq("id", uid).maybeSingle(),
    supabase.rpc("mfa_code_needed"),
  ]);
  // A failed lookup is an outage, not a disabled account: show the error screen instead of signing out.
  if (error) throw new Error("Could not load your profile");
  if (!profile || !profile.active) redirect("/auth/signout?reason=disabled");

  // Two-step login switched on, but this session hasn't entered the code yet.
  if (codeNeeded) redirect("/mfa");

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
    isAdmin: profile.role === "admin",
  };
});

export async function requireAdmin() {
  const me = await getMe();
  if (!me.isAdmin) redirect("/");
  return me;
}
