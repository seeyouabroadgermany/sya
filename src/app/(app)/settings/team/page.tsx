import type { Metadata } from "next";
import { TeamSettings } from "@/components/app/settings/team";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await getMe();
  const supabase = await createClient();
  const [{ data: team }, { data: students }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, role, active").order("full_name"),
    supabase.from("students").select("assigned_to").in("status", ["active", "on_hold"]),
  ]);
  const counts = new Map<string, number>();
  for (const s of students ?? []) if (s.assigned_to) counts.set(s.assigned_to, (counts.get(s.assigned_to) ?? 0) + 1);
  return <TeamSettings meId={me.id} team={(team ?? []).map((t) => ({ ...t, students: counts.get(t.id) ?? 0 }))} />;
}
