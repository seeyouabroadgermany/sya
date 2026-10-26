import { MONTHS } from "./constants";

const DAY = 86_400_000;

// "Today" for the team is India time, whatever the server's clock says.
export function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  return new Date(d.getTime() + days * DAY).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso + "T00:00:00Z") - Date.parse(fromIso + "T00:00:00Z")) / DAY);
}

// DD MMM YYYY, e.g. 07 Sep 2027
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const iso = typeof value === "string" ? value : value.toISOString();
  const datePart = iso.length === 10 ? iso : new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [y, m, d] = datePart.split("-");
  if (!y || !m || !d) return "";
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const time = new Date(value).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatDate(value)}, ${time}`;
}

// Friendly relative day for follow-ups and tasks.
export function relativeDay(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const diff = daysBetween(todayIST(), isoDate);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${-diff} days overdue`;
  if (diff < 7) return `In ${diff} days`;
  return formatDate(isoDate);
}

export function intakeLabel(month: number | null | undefined, year: number | null | undefined): string {
  if (!month || !year) return "";
  return `${MONTHS[month - 1]} ${year}`;
}

const MONEY_LOCALE: Record<string, string> = { INR: "en-IN", CZK: "cs-CZ", EUR: "de-DE" };

export function formatMoney(amount: number | string, currency: string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat(MONEY_LOCALE[currency] ?? "en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

// Indian numbers without a country code get +91.
export function phoneDigits(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  return digits;
}

export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits.length < 8 ? null : `tel:+${digits}`;
}
