export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; missing?: { stage_name: string; label: string }[] };

export const fail = (error: string, extra?: { missing?: { stage_name: string; label: string }[] }) =>
  ({ ok: false as const, error, ...extra });

// Turn database errors into plain sentences for the team.
export function friendlyError(e: { message?: string; code?: string } | null | undefined): string {
  const msg = e?.message ?? "";
  if (msg.includes("STAGE_GATE")) return "Some required steps aren't done yet.";
  if (msg.includes("Only an admin")) return msg;
  if (e?.code === "42501" || msg.includes("row-level security")) return "You don't have access to this student.";
  if (e?.code === "23505") return "That already exists.";
  if (e?.code === "23514") return "One of the values isn't allowed. Check the form.";
  return "Something went wrong saving that. Try again.";
}
