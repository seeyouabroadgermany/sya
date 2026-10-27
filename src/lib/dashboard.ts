import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LEAD_SOURCES, MONTHS, labelOf, type LeadSource } from "@/lib/constants";

const IST = 5.5 * 3_600_000;
const monthKey = (iso: string) => new Date(Date.parse(iso) + IST).toISOString().slice(0, 7); // "2026-10"

/*
  Everything on the dashboard, computed from the rows the viewer is allowed to see.
  Admin gets the whole team; a counsellor automatically gets only their own students (RLS).
*/
export async function getDashboard() {
  const supabase = await createClient();
  const now = new Date(Date.now() + IST);
  const thisMonth = now.toISOString().slice(0, 7);
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const monthStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - IST).toISOString();

  const [{ data: students }, { data: stages }, { data: keySteps }, { data: moves }, { data: profiles }] = await Promise.all([
    supabase
      .from("student_board")
      .select("id, created_at, lead_source, heard_about, stage_position, current_stage_id, status, intake_month, intake_year, assigned_to, is_stuck, followup_overdue"),
    supabase.from("stages").select("id, name, position").eq("country", "CZ").eq("active", true).order("position"),
    supabase.from("stage_steps").select("id, key, stage_id").in("key", ["visa_result", "exam_required"]),
    supabase.from("activity_log").select("author_id, meta").eq("kind", "stage_change").gte("created_at", monthStartIso),
    supabase.from("profiles").select("id, full_name, role, active"),
  ]);
  const all = students ?? [];
  const stageList = stages ?? [];

  // Visa results come from the "Result" step in the Visa stage.
  const visaStep = keySteps?.find((s) => s.key === "visa_result");
  const { data: visaRows } = visaStep
    ? await supabase.from("student_steps").select("student_id, value").eq("step_id", visaStep.id).eq("done", true)
    : { data: [] as { student_id: string; value: string | null }[] };
  const visa = new Map((visaRows ?? []).map((r) => [r.student_id, r.value]));

  // "Applied" = reached the University Application stage (wherever the admin has placed it).
  const appStageId = keySteps?.find((s) => s.key === "exam_required")?.stage_id;
  const appPosition = stageList.find((s) => s.id === appStageId)?.position ?? 4;
  const applied = (s: (typeof all)[number]) => s.status === "completed" || (s.stage_position ?? 0) >= appPosition;

  const open = all.filter((s) => s.status === "active" || s.status === "on_hold");
  const approved = all.filter((s) => visa.get(s.id!) === "pass").length;
  const rejected = all.filter((s) => visa.get(s.id!) === "fail").length;

  // Leads per month, last 12 months including this one.
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    const key = d.toISOString().slice(0, 7);
    return { key, label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, leads: 0, current: key === thisMonth };
  });
  const byMonth = new Map(months.map((m) => [m.key, m]));
  for (const s of all) {
    const m = byMonth.get(monthKey(s.created_at!));
    if (m) m.leads++;
  }

  // Where leads come from: website leads are split by how they heard about SYB.
  const sources = new Map<string, number>();
  for (const s of all) {
    const label =
      s.lead_source === "website"
        ? `Website${s.heard_about && s.heard_about !== "website" ? ` (via ${labelOf(LEAD_SOURCES, s.heard_about as LeadSource)})` : ""}`
        : labelOf(LEAD_SOURCES, s.lead_source as LeadSource);
    sources.set(label, (sources.get(label) ?? 0) + 1);
  }

  // By intake.
  const intakes = new Map<string, { label: string; sort: number; leads: number; applied: number; visas: number; lost: number }>();
  for (const s of all) {
    if (!s.intake_year || !s.intake_month) continue;
    const key = `${s.intake_year}-${s.intake_month}`;
    const row = intakes.get(key) ?? { label: `${MONTHS[s.intake_month - 1]} ${s.intake_year}`, sort: s.intake_year * 100 + s.intake_month, leads: 0, applied: 0, visas: 0, lost: 0 };
    row.leads++;
    if (applied(s)) row.applied++;
    if (visa.get(s.id!) === "pass") row.visas++;
    if (s.status === "lost") row.lost++;
    intakes.set(key, row);
  }

  // Counsellor leaderboard (only meaningful for admin; staff only see their own row).
  const movedBy = new Map<string, number>();
  for (const m of moves ?? []) if (m.author_id) movedBy.set(m.author_id, (movedBy.get(m.author_id) ?? 0) + 1);
  const leaderboard = (profiles ?? [])
    .filter((p) => p.active && p.role === "staff")
    .map((p) => {
      const mine = all.filter((s) => s.assigned_to === p.id);
      return {
        id: p.id,
        name: p.full_name,
        open: mine.filter((s) => s.status === "active" || s.status === "on_hold").length,
        moved: movedBy.get(p.id) ?? 0,
        visas: mine.filter((s) => visa.get(s.id!) === "pass").length,
        overdue: mine.filter((s) => s.followup_overdue).length,
        stuck: mine.filter((s) => s.is_stuck).length,
      };
    })
    .sort((a, b) => b.visas - a.visas || b.moved - a.moved || b.open - a.open);

  return {
    tiles: {
      newThisMonth: all.filter((s) => monthKey(s.created_at!) === thisMonth).length,
      newLastMonth: all.filter((s) => monthKey(s.created_at!) === lastMonth).length,
      open: open.length,
      stuck: open.filter((s) => s.is_stuck).length,
      approved,
      rejected,
    },
    funnel: [
      { label: "Leads", value: all.length },
      { label: "Applied to a university", value: all.filter(applied).length },
      { label: "Visa approved", value: approved },
    ],
    perStage: stageList.map((st) => ({ label: st.name, position: st.position, value: open.filter((s) => s.current_stage_id === st.id).length })),
    months,
    sources: [...sources.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    intakes: [...intakes.values()].sort((a, b) => a.sort - b.sort),
    leaderboard,
  };
}
export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
