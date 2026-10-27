import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { BoardFilters } from "@/components/app/pipeline/filters";
import { StudentsTable } from "@/components/app/students/students-table";
import { getMe } from "@/lib/auth";
import { getIntakes, getStages, getStudentList, getTeam, getUniversities, parseBoardFilters } from "@/lib/data";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const me = await getMe();
  const filters = parseBoardFilters(await searchParams);
  const [students, stages, intakes, universities, team] = await Promise.all([
    getStudentList(filters),
    getStages(),
    getIntakes(),
    getUniversities(),
    me.isAdmin ? getTeam() : Promise.resolve([]),
  ]);
  const counsellors = team.filter((t) => t.active).map((t) => ({ id: t.id, full_name: t.full_name }));

  return (
    <>
      <PageHeader
        title="Students"
        description={me.isAdmin ? "Everyone in the CRM. Select students to assign them in bulk." : "Your students."}
      />
      <Suspense>
        <BoardFilters
          options={{ intakes, universities, counsellors: me.isAdmin ? counsellors : null, stages, showStatus: true }}
        />
      </Suspense>
      <StudentsTable key={JSON.stringify(filters)} students={students} isAdmin={me.isAdmin} team={counsellors} />
    </>
  );
}
