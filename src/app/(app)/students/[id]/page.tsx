import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudentWorkspace } from "@/components/app/student/workspace";
import { getMe } from "@/lib/auth";
import { getStages, getStudentProfile, getTeam, getUniversities } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/students/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = /^[0-9a-f-]{36}$/.test(id) ? await getStudentProfile(id) : null;
  return { title: p?.student.full_name ?? "Student" };
}

export default async function StudentPage({ params }: PageProps<"/students/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const me = await getMe();
  const supabase = await createClient();
  const [profile, stages, universities, team, { data: templates }] = await Promise.all([
    getStudentProfile(id),
    getStages(),
    getUniversities(),
    me.isAdmin ? getTeam() : Promise.resolve([]),
    supabase.from("message_templates").select("id, name, body").order("position"),
  ]);
  // Not found and "not yours" look the same, so staff can't probe other students.
  if (!profile) notFound();

  return (
    <StudentWorkspace
      profile={profile}
      stages={stages}
      universities={universities}
      team={team.filter((t) => t.active).map((t) => ({ id: t.id, full_name: t.full_name }))}
      isAdmin={me.isAdmin}
      templates={templates ?? []}
      myName={me.fullName}
    />
  );
}
