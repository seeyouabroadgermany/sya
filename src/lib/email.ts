import "server-only";

/*
  Sends email through Resend (https://resend.com, free tier).
  Optional: without RESEND_API_KEY the CRM works normally and just skips emails.
*/
export async function sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!key || !from || recipients.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email skipped] ${subject} -> ${recipients.join(", ")}`);
      // In development, keep a copy so emails can be checked in a browser.
      const { mkdir, writeFile } = await import("node:fs/promises");
      const dir = `${process.cwd()}/.email-previews`;
      await mkdir(dir, { recursive: true });
      const file = `${Date.now()}-${recipients[0]?.replace(/[^a-z0-9]/gi, "_")}.html`;
      await writeFile(`${dir}/${file}`, `<!-- To: ${recipients.join(", ")} | Subject: ${subject} -->\n${html}`);
    }
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, html }),
    });
    if (!res.ok) console.error("Email failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("Email failed", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function siteUrl(path = "") {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "") + path;
}

// Simple, readable layout that works in every mail app.
export function emailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f8fb;font-family:Inter,Arial,sans-serif;color:#0a0a0b">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-weight:700;font-size:15px;margin:0 0 24px">See You Abroad CRM</p>
<div style="background:#fff;border:1px solid #e2e7ef;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${body}</div>
<p style="color:#5b6475;font-size:12px;margin-top:16px">You get this because you're on the SYB team.</p>
</div></body></html>`;
}

export function assignmentEmail(counsellorName: string, students: { id: string; full_name: string }[]) {
  const first = counsellorName.split(" ")[0];
  const items = students
    .map((s) => `<li style="margin:6px 0"><a href="${siteUrl(`/students/${s.id}`)}" style="color:#1a4fe0">${esc(s.full_name)}</a></li>`)
    .join("");
  const title = students.length === 1 ? `New student: ${students[0].full_name}` : `${students.length} new students for you`;
  return {
    subject: title,
    html: emailLayout(
      title,
      `<p style="margin:0 0 12px">Hi ${esc(first)}, ${students.length === 1 ? "this student is" : "these students are"} now assigned to you:</p>
<ul style="padding-left:20px;margin:0 0 16px">${items}</ul>
<p style="margin:0">Call them soon and set a follow-up date.</p>`,
    ),
  };
}
