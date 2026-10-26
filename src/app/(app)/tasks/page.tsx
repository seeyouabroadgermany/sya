import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { NewTaskButton, TodayView } from "@/components/app/tasks/today";
import { getMe } from "@/lib/auth";
import { getTeam, getToday } from "@/lib/data";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Today" };

export default async function TasksPage() {
  const me = await getMe();
  const [data, team] = await Promise.all([getToday(), me.isAdmin ? getTeam() : Promise.resolve([])]);
  const firstName = me.fullName.split(" ")[0];
  return (
    <>
      <PageHeader
        title="Today"
        description={`${formatDate(data.today)}. ${me.isAdmin ? "Everything due across the team." : `Your follow-ups and tasks, ${firstName}.`}`}
        actions={
          <NewTaskButton
            isAdmin={me.isAdmin}
            team={team.filter((t) => t.active && t.id !== me.id).map((t) => ({ id: t.id, full_name: t.full_name }))}
          />
        }
      />
      <TodayView data={data} isAdmin={me.isAdmin} />
    </>
  );
}
