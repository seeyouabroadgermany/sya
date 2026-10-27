import type { Metadata } from "next";
import { UniversitySettings } from "@/components/app/settings/lists";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Universities" };

export default async function UniversitySettingsPage() {
  const supabase = await createClient();
  const [{ data: unis }, { data: used }] = await Promise.all([
    supabase.from("universities").select("id, name, city").order("name"),
    supabase.from("shortlist").select("university_id"),
  ]);
  const counts = new Map<string, number>();
  for (const s of used ?? []) counts.set(s.university_id, (counts.get(s.university_id) ?? 0) + 1);
  return <UniversitySettings universities={(unis ?? []).map((u) => ({ ...u, students: counts.get(u.id) ?? 0 }))} />;
}
