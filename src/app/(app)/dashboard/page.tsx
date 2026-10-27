import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { LeadsByMonthChart } from "@/components/app/dashboard/leads-chart";
import { BarList, Panel, Tile } from "@/components/app/dashboard/parts";
import { getMe } from "@/lib/auth";
import { getDashboard } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const me = await getMe();
  const d = await getDashboard();
  const diff = d.tiles.newThisMonth - d.tiles.newLastMonth;
  const leads = d.funnel[0].value;

  return (
    <>
      <PageHeader title="Dashboard" description={me.isAdmin ? "The whole team." : "Your own students."} />
      <div className="space-y-4 px-4 pb-16 md:px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile
            label="New leads this month"
            value={d.tiles.newThisMonth}
            detail={diff === 0 ? "Same as last month" : `${Math.abs(diff)} ${diff > 0 ? "more" : "fewer"} than last month (${d.tiles.newLastMonth})`}
          />
          <Tile label="Students in progress" value={d.tiles.open} detail="Active and on hold" />
          <Tile label="Visas approved" value={d.tiles.approved} tone="success" detail={`${d.tiles.rejected} rejected`} />
          <Tile label="Stuck right now" value={d.tiles.stuck} tone="warning" detail="Longer in a stage than its limit" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title="New leads per month" note="Last 12 months">
            <LeadsByMonthChart months={d.months} />
          </Panel>
          <Panel title="From lead to visa" note="All students so far">
            <BarList rows={d.funnel} max={Math.max(1, leads)} showShare={leads} />
            <p className="mt-4 text-xs text-subtle">Percentages are of all leads.</p>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Students per stage" note="Active and on hold">
            <BarList rows={d.perStage.map((s) => ({ label: s.label, value: s.value, prefix: String(s.position) }))} />
          </Panel>
          <Panel title="Where leads come from" note="All time">
            {d.sources.length ? <BarList rows={d.sources} showShare={leads} /> : <p className="text-sm text-subtle">No leads yet.</p>}
          </Panel>
        </div>

        <Panel title="By intake">
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-xs text-subtle">
                <tr className="border-b border-line">
                  <th className="h-9 pr-3 text-left font-medium">Intake</th>
                  <th className="h-9 px-3 text-right font-medium">Leads</th>
                  <th className="h-9 px-3 text-right font-medium">Applied</th>
                  <th className="h-9 px-3 text-right font-medium">Visas approved</th>
                  <th className="h-9 pl-3 text-right font-medium">Lost</th>
                </tr>
              </thead>
              <tbody className="num">
                {d.intakes.map((i) => (
                  <tr key={i.label} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3">{i.label}</td>
                    <td className="px-3 py-2 text-right">{i.leads}</td>
                    <td className="px-3 py-2 text-right">{i.applied}</td>
                    <td className={cn("px-3 py-2 text-right", i.visas > 0 && "text-success")}>{i.visas}</td>
                    <td className="py-2 pl-3 text-right text-subtle">{i.lost}</td>
                  </tr>
                ))}
                {d.intakes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-subtle">
                      No intakes recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {me.isAdmin && (
          <Panel title="Counsellors" note="Stage moves count this month">
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-xs text-subtle">
                  <tr className="border-b border-line">
                    <th className="h-9 pr-3 text-left font-medium">Counsellor</th>
                    <th className="h-9 px-3 text-right font-medium">Students</th>
                    <th className="h-9 px-3 text-right font-medium">Moved on this month</th>
                    <th className="h-9 px-3 text-right font-medium">Visas approved</th>
                    <th className="h-9 px-3 text-right font-medium">Overdue follow-ups</th>
                    <th className="h-9 pl-3 text-right font-medium">Stuck</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {d.leaderboard.map((c) => (
                    <tr key={c.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-3">{c.name}</td>
                      <td className="px-3 py-2 text-right">{c.open}</td>
                      <td className="px-3 py-2 text-right">{c.moved}</td>
                      <td className={cn("px-3 py-2 text-right", c.visas > 0 && "text-success")}>{c.visas}</td>
                      <td className={cn("px-3 py-2 text-right", c.overdue > 0 && "text-danger")}>{c.overdue}</td>
                      <td className={cn("py-2 pl-3 text-right", c.stuck > 0 && "text-warning")}>{c.stuck}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
