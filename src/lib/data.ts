import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type BoardStudent = Database["public"]["Views"]["student_board"]["Row"];
export type Stage = Pick<Database["public"]["Tables"]["stages"]["Row"], "id" | "name" | "position" | "stuck_after_days">;

export const getStages = cache(async (country = "CZ"): Promise<Stage[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("stages")
    .select("id, name, position, stuck_after_days")
    .eq("country", country)
    .eq("active", true)
    .order("position");
  return data ?? [];
});

export const getUniversities = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("universities").select("id, name, city").order("name");
  return data ?? [];
});

export const getTeam = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name, role, active").order("full_name");
  return data ?? [];
});

export type BoardFilters = {
  intake?: string; // "9-2027"
  university?: string;
  counsellor?: string; // profile id or "none"
  level?: string;
  stuck?: boolean;
  q?: string;
  stage?: string;
  status?: string; // "open" (default), "all", or one status
};

export function parseBoardFilters(sp: Record<string, string | string[] | undefined>): BoardFilters {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  return {
    intake: one("intake"),
    university: one("university"),
    counsellor: one("counsellor"),
    level: one("level"),
    stuck: one("stuck") === "1",
    q: one("q"),
    stage: one("stage"),
    status: one("status"),
  };
}

export async function getBoard(filters: BoardFilters, statuses: Database["public"]["Enums"]["student_status"][] = ["active", "on_hold"]) {
  const supabase = await createClient();
  let query = supabase.from("student_board").select("*").in("status", statuses).order("stage_entered_at");

  if (filters.intake && /^\d{1,2}-\d{4}$/.test(filters.intake)) {
    const [m, y] = filters.intake.split("-").map(Number);
    query = query.eq("intake_month", m).eq("intake_year", y);
  }
  if (filters.university && /^[0-9a-f-]{36}$/.test(filters.university)) query = query.eq("final_university_id", filters.university);
  if (filters.counsellor === "none") query = query.is("assigned_to", null);
  else if (filters.counsellor && /^[0-9a-f-]{36}$/.test(filters.counsellor)) query = query.eq("assigned_to", filters.counsellor);
  if (filters.level === "bachelor" || filters.level === "master") query = query.eq("level", filters.level);
  if (filters.stuck) query = query.eq("is_stuck", true);
  if (filters.stage && /^[0-9a-f-]{36}$/.test(filters.stage)) query = query.eq("current_stage_id", filters.stage);
  if (filters.q) {
    const q = filters.q.replace(/[%,()]/g, " ").trim();
    if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Distinct intakes that exist, for the filter list.
export async function getIntakes() {
  const supabase = await createClient();
  const { data } = await supabase.from("students").select("intake_month, intake_year").not("intake_year", "is", null);
  const set = new Map<string, { month: number; year: number }>();
  for (const r of data ?? []) {
    if (r.intake_month && r.intake_year) set.set(`${r.intake_month}-${r.intake_year}`, { month: r.intake_month, year: r.intake_year });
  }
  return [...set.entries()]
    .sort(([, a], [, b]) => a.year - b.year || a.month - b.month)
    .map(([value, v]) => ({ value, ...v }));
}

export type StepDef = Database["public"]["Tables"]["stage_steps"]["Row"];
export type StudentStep = Database["public"]["Tables"]["student_steps"]["Row"];

// Everything the student profile needs, in parallel. RLS decides what comes back.
export const getStudentProfile = cache(async (id: string) => {
  const supabase = await createClient();
  const [student, board, steps, studentSteps, shortlist, activity, tasks, documents, payments] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("student_board").select("*").eq("id", id).maybeSingle(),
    supabase.from("stage_steps").select("*").eq("active", true).order("position"),
    supabase.from("student_steps").select("*").eq("student_id", id),
    supabase
      .from("shortlist")
      .select("id, course, is_final, university:universities(id, name, city)")
      .eq("student_id", id)
      .order("created_at"),
    supabase
      .from("activity_log")
      .select("id, kind, body, created_at, author:profiles(full_name)")
      .eq("student_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("tasks")
      .select("id, title, due_on, done, assigned_to")
      .eq("student_id", id)
      .order("done")
      .order("due_on"),
    supabase
      .from("student_documents")
      .select("status, updated_at, document_type:document_types!inner(id, name, required, position, active), checker:profiles(full_name)")
      .eq("student_id", id)
      .eq("document_type.active", true),
    supabase.from("payments").select("*").eq("student_id", id).order("created_at"),
  ]);
  if (!student.data || !board.data) return null;
  return {
    student: student.data,
    board: board.data,
    steps: steps.data ?? [],
    studentSteps: studentSteps.data ?? [],
    shortlist: shortlist.data ?? [],
    activity: activity.data ?? [],
    tasks: tasks.data ?? [],
    documents: (documents.data ?? []).sort((a, b) => a.document_type.position - b.document_type.position),
    payments: payments.data ?? [],
  };
});
export type StudentProfile = NonNullable<Awaited<ReturnType<typeof getStudentProfile>>>;

// The "Today" page: follow-ups, stuck students and tasks. RLS limits staff to their own.
export async function getToday() {
  const supabase = await createClient();
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const weekAhead = new Date(Date.now() + 5.5 * 3_600_000 + 7 * 86_400_000).toISOString().slice(0, 10);
  const [followups, stuck, tasks] = await Promise.all([
    supabase
      .from("student_board")
      .select("*")
      .in("status", ["active", "on_hold"])
      .not("next_followup_on", "is", null)
      .lte("next_followup_on", weekAhead)
      .order("next_followup_on"),
    supabase.from("student_board").select("*").eq("is_stuck", true).order("stage_entered_at"),
    supabase
      .from("tasks")
      .select("id, title, due_on, done, assigned_to, student:students(id, full_name), assignee:profiles!tasks_assigned_to_fkey(full_name)")
      .eq("done", false)
      .lte("due_on", weekAhead)
      .order("due_on"),
  ]);
  return {
    today,
    followups: followups.data ?? [],
    stuck: stuck.data ?? [],
    tasks: tasks.data ?? [],
  };
}
export type TodayData = Awaited<ReturnType<typeof getToday>>;

type Status = Database["public"]["Enums"]["student_status"];
const STATUS_VALUES: Status[] = ["active", "on_hold", "lost", "completed"];

// Students table: same filters as the board plus stage and status.
export async function getStudentList(filters: BoardFilters) {
  const statuses: Status[] =
    filters.status === "everyone"
      ? STATUS_VALUES
      : STATUS_VALUES.includes(filters.status as Status)
        ? [filters.status as Status]
        : ["active", "on_hold"];
  return getBoard(filters, statuses);
}

const digits = (p: string | null) => (p ?? "").replace(/\D/g, "").slice(-10);

// Admin inbox: unassigned, still-open leads, newest first, with a duplicate-phone hint.
export async function getInbox() {
  const supabase = await createClient();
  const [{ data: leads }, { data: all }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, phone, email, city, level, intake_month, intake_year, course_interest, budget_range, lead_source, heard_about, referred_by, parent_name, created_at")
      .is("assigned_to", null)
      .in("status", ["active", "on_hold"])
      .order("created_at", { ascending: false }),
    supabase.from("students").select("id, full_name, phone, assigned_to, counsellor:profiles!students_assigned_to_fkey(full_name)"),
  ]);
  const byPhone = new Map<string, { id: string; full_name: string; counsellor: string | null }[]>();
  for (const s of all ?? []) {
    const key = digits(s.phone);
    if (key.length < 8) continue;
    byPhone.set(key, [...(byPhone.get(key) ?? []), { id: s.id, full_name: s.full_name, counsellor: s.counsellor?.full_name ?? null }]);
  }
  return (leads ?? []).map((l) => ({
    ...l,
    duplicates: (byPhone.get(digits(l.phone)) ?? []).filter((d) => d.id !== l.id),
  }));
}
export type InboxLead = Awaited<ReturnType<typeof getInbox>>[number];

export async function getPayments(filters: { intake?: string; status?: string; kind?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select("id, kind, amount, currency, status, due_date, paid_on, note, created_at, student:students!inner(id, full_name, intake_month, intake_year, counsellor:profiles!students_assigned_to_fkey(full_name))")
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false });
  if (filters.intake && /^\d{1,2}-\d{4}$/.test(filters.intake)) {
    const [m, y] = filters.intake.split("-").map(Number);
    query = query.eq("student.intake_month", m).eq("student.intake_year", y);
  }
  if (filters.status === "paid" || filters.status === "pending") query = query.eq("status", filters.status);
  if (["agency", "university", "nostrification", "other"].includes(filters.kind ?? ""))
    query = query.eq("kind", filters.kind as Database["public"]["Enums"]["payment_kind"]);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
export type PaymentRow = Awaited<ReturnType<typeof getPayments>>[number];

// Little numbers for the navigation badges.
export async function getNavCounts(isAdmin: boolean) {
  const supabase = await createClient();
  const today = new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
  const [due, stuck, tasks, inbox] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .in("status", ["active", "on_hold"])
      .lte("next_followup_on", today),
    supabase.from("student_board").select("id", { count: "exact", head: true }).eq("is_stuck", true),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("done", false).lte("due_on", today),
    isAdmin
      ? supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .is("assigned_to", null)
          .in("status", ["active", "on_hold"])
      : Promise.resolve({ count: 0 }),
  ]);
  return {
    today: (due.count ?? 0) + (stuck.count ?? 0) + (tasks.count ?? 0),
    leads: inbox.count ?? 0,
  };
}
