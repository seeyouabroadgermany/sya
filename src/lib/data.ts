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
  const [student, board, steps, studentSteps, shortlist, activity, tasks] = await Promise.all([
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
