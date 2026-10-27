"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentStatusButton, totalsByCurrency } from "@/components/app/student/payments";
import { MONTHS, PAYMENT_KINDS, labelOf, type PaymentKind } from "@/lib/constants";
import { downloadRows } from "@/lib/export";
import { formatDate, formatMoney, intakeLabel, todayIST } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentRow } from "@/lib/data";

export function PaymentsView({
  payments,
  intakes,
}: {
  payments: PaymentRow[];
  intakes: { value: string; month: number; year: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const [exporting, setExporting] = useState(false);
  const today = todayIST();
  const totals = totalsByCurrency(payments);

  // Paid vs pending per kind and currency.
  const byKind = PAYMENT_KINDS.map((k) => ({
    ...k,
    totals: totalsByCurrency(payments.filter((p) => p.kind === k.value)),
  })).filter((k) => k.totals.length > 0);

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  async function exportAs(format: "xlsx" | "csv") {
    if (!payments.length) return toast.error("Nothing to export with these filters.");
    setExporting(true);
    try {
      await downloadRows(
        payments.map((p) => ({
          Student: p.student.full_name,
          Intake: intakeLabel(p.student.intake_month, p.student.intake_year),
          Counsellor: p.student.counsellor?.full_name ?? "Unassigned",
          For: labelOf(PAYMENT_KINDS, p.kind as PaymentKind),
          Amount: Number(p.amount),
          Currency: p.currency,
          Status: p.status === "paid" ? "Paid" : "Pending",
          "Due date": formatDate(p.due_date),
          "Paid on": formatDate(p.paid_on),
          Note: p.note ?? "",
        })),
        "syb-payments",
        format,
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6 px-4 pb-16 md:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Filter label="Intake" value={params.get("intake")} onChange={(v) => set("intake", v)}
          items={[{ value: "all", label: "All intakes" }, ...intakes.map((i) => ({ value: i.value, label: `${MONTHS[i.month - 1]} ${i.year}` }))]} />
        <Filter label="Status" value={params.get("status")} onChange={(v) => set("status", v)}
          items={[{ value: "all", label: "Paid and pending" }, { value: "pending", label: "Pending only" }, { value: "paid", label: "Paid only" }]} />
        <Filter label="For" value={params.get("kind")} onChange={(v) => set("kind", v)}
          items={[{ value: "all", label: "All payment types" }, ...PAYMENT_KINDS]} />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={exporting} onClick={() => exportAs("xlsx")}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            Excel
          </Button>
          <Button variant="outline" disabled={exporting} onClick={() => exportAs("csv")}>
            CSV
          </Button>
        </div>
      </div>

      <section aria-label="Totals" className="grid gap-3 sm:grid-cols-3">
        {totals.map(([cur, t]) => (
          <div key={cur} className="rounded-[12px] border border-line bg-surface p-4">
            <p className="text-sm text-subtle">{cur}</p>
            <p className="num mt-2 text-[28px] leading-none font-semibold tracking-tight">{formatMoney(t.paid, cur)}</p>
            <p className="mt-1 text-xs text-subtle">paid</p>
            <p className={cn("num mt-3 text-sm", t.pending > 0 ? "text-warning" : "text-subtle")}>
              {formatMoney(t.pending, cur)} pending
            </p>
          </div>
        ))}
        {totals.length === 0 && <p className="text-sm text-subtle">No payments match these filters.</p>}
      </section>

      {byKind.length > 0 && (
        <section>
          <h2 className="mb-2 text-base font-semibold">By payment type</h2>
          <div className="overflow-x-auto rounded-[12px] border border-line">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-surface text-xs text-subtle">
                <tr className="border-b border-line">
                  <th className="h-9 px-3 text-left font-medium">Type</th>
                  <th className="h-9 px-3 text-left font-medium">Currency</th>
                  <th className="h-9 px-3 text-right font-medium">Paid</th>
                  <th className="h-9 px-3 text-right font-medium">Pending</th>
                </tr>
              </thead>
              <tbody>
                {byKind.flatMap((k) =>
                  k.totals.map(([cur, t], i) => (
                    <tr key={k.value + cur} className="border-b border-line last:border-0">
                      <td className="px-3 py-2">{i === 0 ? k.label : ""}</td>
                      <td className="px-3 py-2 text-subtle">{cur}</td>
                      <td className="num px-3 py-2 text-right">{formatMoney(t.paid, cur)}</td>
                      <td className={cn("num px-3 py-2 text-right", t.pending > 0 && "text-warning")}>{formatMoney(t.pending, cur)}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-base font-semibold">
          All payments <span className="num text-sm font-normal text-subtle">{payments.length}</span>
        </h2>
        <ul className="divide-y divide-line rounded-[12px] border border-line">
          {payments.map((p) => {
            const overdue = p.status === "pending" && p.due_date && p.due_date < today;
            return (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/students/${p.student.id}`} className="block truncate text-sm font-medium hover:underline">
                    {p.student.full_name}
                  </Link>
                  <p className="truncate text-xs text-subtle">
                    {labelOf(PAYMENT_KINDS, p.kind as PaymentKind)}
                    {p.student.intake_year ? `, ${intakeLabel(p.student.intake_month, p.student.intake_year)} intake` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-sm font-semibold">{formatMoney(p.amount, p.currency)}</p>
                  <p className={cn("num text-xs text-subtle", overdue && "text-danger")}>
                    {p.status === "paid" ? formatDate(p.paid_on) : p.due_date ? `${overdue ? "Overdue " : "Due "}${formatDate(p.due_date)}` : "No due date"}
                  </p>
                </div>
                <PaymentStatusButton id={p.id} status={p.status} />
              </li>
            );
          })}
          {payments.length === 0 && <li className="p-6 text-center text-sm text-subtle">Payments you add on a student&apos;s profile show up here.</li>}
        </ul>
      </section>
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string | null;
  onChange: (v: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <Select value={value ?? "all"} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("min-w-40 flex-1 sm:flex-none", value && "border-brand/60")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
