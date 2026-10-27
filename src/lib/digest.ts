import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailLayout, sendEmail, siteUrl } from "@/lib/email";
import { formatDate } from "@/lib/format";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Row = { id: string; full_name: string; detail: string };

function list(title: string, rows: Row[], colour = "#0a0a0b") {
  if (!rows.length) return "";
  const items = rows
    .slice(0, 25)
    .map((r) => `<li style="margin:6px 0"><a href="${siteUrl(`/students/${r.id}`)}" style="color:#1a4fe0">${esc(r.full_name)}</a> <span style="color:#5b6475">${esc(r.detail)}</span></li>`)
    .join("");
  const more = rows.length > 25 ? `<p style="color:#5b6475;margin:4px 0 0">and ${rows.length - 25} more</p>` : "";
  return `<h2 style="font-size:15px;margin:20px 0 6px;color:${colour}">${esc(title)} (${rows.length})</h2><ul style="padding-left:20px;margin:0">${items}</ul>${more}`;
}

/*
  The 8:00 am email. Each counsellor: overdue and today's follow-ups, tasks due, stuck students.
  Each admin: a team summary plus new leads waiting. Runs with the secret key (no logged-in user).
*/
export async function runDailyDigest(today: string) {
  const db = createAdminClient();
  const { data: settings } = await db.from("app_settings").select("digest_enabled").eq("id", 1).single();
  if (!settings?.digest_enabled) return { skipped: "digest switched off in Settings", sent: 0 };

  const [{ data: people }, { data: students }, { data: tasks }] = await Promise.all([
    db.from("profiles").select("id, full_name, email, role").eq("active", true),
    db
      .from("student_board")
      .select("id, full_name, assigned_to, next_followup_on, is_stuck, days_in_stage, stage_name, status")
      .in("status", ["active", "on_hold"]),
    db.from("tasks").select("id, title, due_on, assigned_to, student:students(id, full_name)").eq("done", false).lte("due_on", today),
  ]);
  const open = students ?? [];
  let sent = 0;

  for (const p of people ?? []) {
    if (!p.email) continue;
    if (p.role === "staff") {
      const mine = open.filter((s) => s.assigned_to === p.id);
      const overdue = mine.filter((s) => s.next_followup_on && s.next_followup_on < today);
      const due = mine.filter((s) => s.next_followup_on === today);
      const stuck = mine.filter((s) => s.is_stuck);
      const myTasks = (tasks ?? []).filter((t) => t.assigned_to === p.id);
      if (!overdue.length && !due.length && !stuck.length && !myTasks.length) continue;
      const html = emailLayout(
        `Good morning, ${p.full_name.split(" ")[0]}`,
        `<p style="margin:0">Here's what needs you today, ${formatDate(today)}.</p>` +
          list("Overdue follow-ups", overdue.map((s) => ({ id: s.id!, full_name: s.full_name!, detail: `since ${formatDate(s.next_followup_on)}` })), "#dc2626") +
          list("Follow-ups today", due.map((s) => ({ id: s.id!, full_name: s.full_name!, detail: s.stage_name ?? "" }))) +
          list("Tasks", myTasks.map((t) => ({ id: t.student?.id ?? "", full_name: t.title, detail: t.student ? `for ${t.student.full_name}` : "" }))) +
          list("Stuck students", stuck.map((s) => ({ id: s.id!, full_name: s.full_name!, detail: `${s.days_in_stage} days in ${s.stage_name}` })), "#d97706") +
          `<p style="margin:24px 0 0"><a href="${siteUrl("/tasks")}" style="display:inline-block;background:#1a4fe0;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open today's list</a></p>`,
      );
      if (await sendEmail(p.email, `Today: ${overdue.length + due.length} follow-ups, ${stuck.length} stuck`, html)) sent++;
    } else {
      const unassigned = open.filter((s) => !s.assigned_to);
      const byCounsellor = (people ?? [])
        .filter((x) => x.role === "staff")
        .map((x) => {
          const mine = open.filter((s) => s.assigned_to === x.id);
          return {
            name: x.full_name,
            open: mine.length,
            overdue: mine.filter((s) => s.next_followup_on && s.next_followup_on < today).length,
            stuck: mine.filter((s) => s.is_stuck).length,
          };
        });
      const rows = byCounsellor
        .map((c) => `<tr><td style="padding:6px 8px 6px 0">${esc(c.name)}</td><td style="padding:6px 8px;text-align:right">${c.open}</td><td style="padding:6px 8px;text-align:right;color:${c.overdue ? "#dc2626" : "#0a0a0b"}">${c.overdue}</td><td style="padding:6px 0 6px 8px;text-align:right;color:${c.stuck ? "#d97706" : "#0a0a0b"}">${c.stuck}</td></tr>`)
        .join("");
      const html = emailLayout(
        `Team summary, ${formatDate(today)}`,
        `<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="color:#5b6475;text-align:left"><th style="padding:6px 8px 6px 0">Counsellor</th><th style="padding:6px 8px;text-align:right">Students</th><th style="padding:6px 8px;text-align:right">Overdue</th><th style="padding:6px 0 6px 8px;text-align:right">Stuck</th></tr></thead><tbody>${rows}</tbody></table>` +
          list("New leads waiting for a counsellor", unassigned.map((s) => ({ id: s.id!, full_name: s.full_name!, detail: "" })), "#1a4fe0") +
          `<p style="margin:24px 0 0"><a href="${siteUrl("/dashboard")}" style="color:#1a4fe0">Open the dashboard</a></p>`,
      );
      if (await sendEmail(p.email, `SYB team: ${open.filter((s) => s.is_stuck).length} stuck, ${unassigned.length} new leads waiting`, html)) sent++;
    }
  }
  return { sent };
}
