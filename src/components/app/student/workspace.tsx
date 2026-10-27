"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Stage, StudentProfile } from "@/lib/data";
import { ActivityTab } from "./activity";
import { DetailsTab } from "./details";
import { DocumentsTab } from "./documents";
import { StudentHeader } from "./header";
import { PaymentsTab } from "./payments";
import { ProgressTab } from "./progress";
import { FollowupCard, StudentTasksCard } from "./side-cards";

export function StudentWorkspace({
  profile,
  stages,
  universities,
  team,
  isAdmin,
  templates,
  myName,
}: {
  templates: { id: string; name: string; body: string }[];
  myName: string;
  profile: StudentProfile;
  stages: Stage[];
  universities: { id: string; name: string; city: string | null }[];
  team: { id: string; full_name: string }[];
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState("progress");
  const [lostOpen, setLostOpen] = useState(false);
  const s = profile.student;

  return (
    <>
      <StudentHeader
        profile={profile}
        totalStages={stages.length}
        isAdmin={isAdmin}
        team={team}
        lostOpen={lostOpen}
        setLostOpen={setLostOpen}
        templates={templates}
        myName={myName}
      />
      <div className="grid items-start gap-4 px-4 pt-5 pb-10 md:grid-cols-[minmax(0,1fr)_300px] md:gap-6 md:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Side column: follow-up first on phones (always visible), tasks after the tabs. */}
        <aside className="space-y-4 md:sticky md:top-6 md:col-start-2 md:row-start-1">
          <FollowupCard studentId={s.id} value={s.next_followup_on} />
          <div className="hidden md:block">
            <StudentTasksCard studentId={s.id} tasks={profile.tasks} />
          </div>
        </aside>
        <Tabs value={tab} onValueChange={setTab} className="min-w-0 md:col-start-1 md:row-start-1">
          <TabsList variant="line" className="scrollbar-none w-full justify-start gap-4 overflow-x-auto border-b border-line">
            <TabsTrigger value="progress" className="flex-none px-0">Progress</TabsTrigger>
            <TabsTrigger value="details" className="flex-none px-0">Details</TabsTrigger>
            <TabsTrigger value="documents" className="flex-none px-0">
              Documents{" "}
              <span className="num text-xs text-subtle">
                {profile.board.docs_ready}/{profile.board.docs_total}
              </span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-none px-0">
              Payments
              {(profile.board.payments_pending ?? 0) > 0 && (
                <span className="num text-xs text-warning">{profile.board.payments_pending}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-none px-0">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="progress" className="pt-3">
            <ProgressTab
              studentId={s.id}
              studentName={s.full_name}
              stages={stages}
              steps={profile.steps}
              studentSteps={profile.studentSteps}
              currentStageId={s.current_stage_id!}
              status={s.status}
              isAdmin={isAdmin}
              onOpenDetails={() => {
                setTab("details");
                setTimeout(() => document.getElementById("shortlist")?.scrollIntoView({ behavior: "smooth" }), 50);
              }}
              onMarkLost={() => setLostOpen(true)}
            />
          </TabsContent>
          <TabsContent value="details" className="pt-5">
            <DetailsTab student={s} shortlist={profile.shortlist} universities={universities} />
          </TabsContent>
          <TabsContent value="documents" className="pt-5">
            <DocumentsTab
              studentId={s.id}
              documents={profile.documents}
              driveUrl={s.drive_folder_url}
              onAddDrive={() => {
                setTab("details");
                setTimeout(() => document.getElementById("d-drive")?.focus(), 50);
              }}
            />
          </TabsContent>
          <TabsContent value="payments" className="pt-5">
            <PaymentsTab studentId={s.id} studentName={s.full_name} payments={profile.payments} />
          </TabsContent>
          <TabsContent value="activity" className="pt-5">
            <ActivityTab studentId={s.id} items={profile.activity} />
          </TabsContent>
        </Tabs>
        <div className="md:hidden">
          <StudentTasksCard studentId={s.id} tasks={profile.tasks} />
        </div>
      </div>
    </>
  );
}
