import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PipelineBoard } from "@/components/app/pipeline/board";
import { BoardFilters } from "@/components/app/pipeline/filters";
import { getMe } from "@/lib/auth";
import { getBoard, getIntakes, getStages, getTeam, getUniversities, parseBoardFilters } from "@/lib/data";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage({ searchParams }: PageProps<"/">) {
  const me = await getMe();
  const filters = parseBoardFilters(await searchParams);
  const [stages, students, intakes, universities, team] = await Promise.all([
    getStages(),
    getBoard(filters),
    getIntakes(),
    getUniversities(),
    me.isAdmin ? getTeam() : Promise.resolve([]),
  ]);
  const stuck = students.filter((s) => s.is_stuck).length;
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={
          <>
            <span className="num">{students.length}</span> {filtered ? "matching" : "active"} students
            {stuck > 0 && (
              <>
                , <span className="num text-warning">{stuck} stuck</span>
              </>
            )}
          </>
        }
      />
      <Suspense>
        <BoardFilters
          options={{
            intakes,
            universities,
            counsellors: me.isAdmin ? team.filter((t) => t.active).map((t) => ({ id: t.id, full_name: t.full_name })) : null,
          }}
        />
      </Suspense>
      <PipelineBoard key={JSON.stringify(filters)} stages={stages} students={students} isAdmin={me.isAdmin} />
    </>
  );
}
