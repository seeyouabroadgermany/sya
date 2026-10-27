import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { LeadInbox, RoundRobinSwitch } from "@/components/app/leads/inbox";
import { requireAdmin } from "@/lib/auth";
import { getInbox, getTeam } from "@/lib/data";
import { siteUrl } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New leads" };

export default async function LeadsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [leads, team, { data: settings }] = await Promise.all([
    getInbox(),
    getTeam(),
    supabase.from("app_settings").select("round_robin_enabled").eq("id", 1).single(),
  ]);
  return (
    <>
      <PageHeader
        title="New leads"
        description={
          leads.length
            ? `${leads.length} waiting for a counsellor. The counsellor gets an email when you assign.`
            : "Website enquiries arrive here."
        }
        actions={<RoundRobinSwitch enabled={settings?.round_robin_enabled ?? false} />}
      />
      <LeadInbox
        leads={leads}
        team={team.filter((t) => t.active && t.role === "staff").map((t) => ({ id: t.id, full_name: t.full_name }))}
        applyUrl={siteUrl("/apply")}
      />
    </>
  );
}
