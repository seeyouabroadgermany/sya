"use client";

import { startTransition, useOptimistic, useState } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PaymentDialog, type PaymentValues } from "@/components/app/payment-dialog";
import { deletePayment, setPaymentStatus } from "@/lib/actions/money-docs";
import { PAYMENT_KINDS, labelOf, type Currency, type PaymentKind } from "@/lib/constants";
import { formatDate, formatMoney, todayIST } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StudentProfile } from "@/lib/data";

type Payment = StudentProfile["payments"][number];

export function totalsByCurrency(items: { amount: number; currency: string; status: string }[]) {
  const map = new Map<string, { paid: number; pending: number }>();
  for (const p of items) {
    const t = map.get(p.currency) ?? { paid: 0, pending: 0 };
    t[p.status === "paid" ? "paid" : "pending"] += Number(p.amount);
    map.set(p.currency, t);
  }
  return [...map.entries()].sort(([a], [b]) => (a === "INR" ? -1 : b === "INR" ? 1 : a.localeCompare(b)));
}

export function PaymentStatusButton({ id, status }: { id: string; status: string }) {
  const [s, setS] = useOptimistic(status);
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const next = s === "paid" ? "pending" : "paid";
          setS(next);
          const res = await setPaymentStatus(id, next);
          if (res.ok) toast.success(next === "paid" ? "Marked as paid" : "Marked as pending");
          else toast.error(res.error);
        })
      }
      aria-label={s === "paid" ? "Paid. Tap to mark pending." : "Pending. Tap to mark paid."}
      className={cn(
        "h-8 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
        s === "paid" ? "border-success/40 bg-success-soft text-success" : "border-line text-subtle hover:border-text/40 hover:text-text",
      )}
    >
      {s === "paid" ? "Paid" : "Mark paid"}
    </button>
  );
}

export function PaymentsTab({ studentId, studentName, payments }: { studentId: string; studentName: string; payments: Payment[] }) {
  const [dialog, setDialog] = useState<{ open: boolean; initial?: PaymentValues }>({ open: false });
  const totals = totalsByCurrency(payments);
  const today = todayIST();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-start">
        <Button onClick={() => setDialog({ open: true })} className="w-full sm:w-auto">
          <Plus /> Add payment
        </Button>
        <div className="grid flex-1 grid-cols-3 gap-2">
          {totals.map(([cur, t]) => (
            <div key={cur} className="min-w-0 rounded-[12px] border border-line bg-surface p-3">
              <p className="text-xs text-subtle">{cur} paid</p>
              <p className="num mt-1 truncate text-sm font-semibold text-success sm:text-base">{formatMoney(t.paid, cur)}</p>
              {t.pending > 0 && (
                <p className="num truncate text-xs text-warning sm:text-sm">{formatMoney(t.pending, cur)} due</p>
              )}
            </div>
          ))}
          {totals.length === 0 && <p className="col-span-3 text-sm text-subtle">No payments recorded yet.</p>}
        </div>
      </div>

      {payments.length > 0 && (
        <ul className="divide-y divide-line rounded-[12px] border border-line">
          {payments.map((p) => {
            const overdue = p.status === "pending" && p.due_date && p.due_date < today;
            return (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {labelOf(PAYMENT_KINDS, p.kind as PaymentKind)}{" "}
                    <span className="num font-semibold">{formatMoney(p.amount, p.currency)}</span>
                  </p>
                  <p className={cn("num text-xs text-subtle", overdue && "text-danger")}>
                    {p.status === "paid"
                      ? `Paid ${formatDate(p.paid_on)}`
                      : p.due_date
                        ? `${overdue ? "Overdue, was due" : "Due"} ${formatDate(p.due_date)}`
                        : "No due date"}
                    {p.note ? `. ${p.note}` : ""}
                  </p>
                </div>
                <PaymentStatusButton id={p.id} status={p.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="More actions" className="text-subtle">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() =>
                        setDialog({
                          open: true,
                          initial: {
                            id: p.id,
                            kind: p.kind as PaymentKind,
                            amount: p.amount,
                            currency: p.currency as Currency,
                            status: p.status as "pending" | "paid",
                            due_date: p.due_date,
                            paid_on: p.paid_on,
                            note: p.note,
                          },
                        })
                      }
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={async () => {
                        const res = await deletePayment(p.id);
                        if (res.ok) toast.success("Payment removed");
                        else toast.error(res.error);
                      }}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}
      <PaymentDialog
        studentId={studentId}
        studentName={studentName}
        open={dialog.open}
        initial={dialog.initial}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
      />
    </div>
  );
}
