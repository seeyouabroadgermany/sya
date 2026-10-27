"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/app/date-picker";
import { Segmented } from "@/components/app/segmented";
import { savePayment } from "@/lib/actions/money-docs";
import { CURRENCIES, DEFAULT_CURRENCY, PAYMENT_KINDS, type Currency, type PaymentKind } from "@/lib/constants";

export type PaymentValues = {
  id?: string;
  kind: PaymentKind;
  amount: number | string;
  currency: Currency;
  status: "pending" | "paid";
  due_date: string | null;
  paid_on: string | null;
  note: string | null;
};

export function PaymentDialog({
  studentId,
  studentName,
  initial,
  open,
  onOpenChange,
}: {
  studentId: string;
  studentName: string;
  initial?: PaymentValues;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  // Remount the form each time it opens so it starts from `initial`.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && <PaymentForm studentId={studentId} studentName={studentName} initial={initial} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  studentId,
  studentName,
  initial,
  onDone,
}: {
  studentId: string;
  studentName: string;
  initial?: PaymentValues;
  onDone: () => void;
}) {
  const [v, setV] = useState<PaymentValues>(
    initial ?? { kind: "agency", amount: "", currency: "INR", status: "pending", due_date: null, paid_on: null, note: null },
  );
  const [currencyTouched, setCurrencyTouched] = useState(!!initial);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await savePayment(studentId, v.id ?? null, {
        kind: v.kind,
        amount: v.amount,
        currency: v.currency,
        status: v.status,
        due_date: v.due_date,
        paid_on: v.status === "paid" ? v.paid_on : null,
        note: v.note ?? "",
      });
      if (res.ok) {
        toast.success(v.id ? "Payment updated" : "Payment added");
        onDone();
      } else toast.error(res.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>{v.id ? "Edit payment" : "Add payment"}</DialogTitle>
        <DialogDescription>{studentName}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label>For</Label>
          <Select
            value={v.kind}
            onValueChange={(k) =>
              setV({ ...v, kind: k as PaymentKind, currency: currencyTouched ? v.currency : DEFAULT_CURRENCY[k as PaymentKind] })
            }
          >
            <SelectTrigger className="w-full" aria-label="Payment for">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pay-amount">Amount</Label>
          <div className="flex gap-2">
            <Input
              id="pay-amount"
              inputMode="decimal"
              value={v.amount}
              onChange={(e) => setV({ ...v, amount: e.target.value.replace(/[^\d.]/g, "") })}
              className="num flex-1"
              required
            />
            <Segmented
              name="Currency"
              value={v.currency}
              onChange={(c) => {
                setCurrencyTouched(true);
                setV({ ...v, currency: c });
              }}
              options={CURRENCIES.map((c) => ({ value: c.value, label: c.value }))}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Status</Label>
          <Segmented
            name="Status"
            value={v.status}
            onChange={(s) => setV({ ...v, status: s })}
            options={[
              { value: "pending", label: "Pending" },
              { value: "paid", label: "Paid" },
            ]}
            tone={(s) => (s === "paid" ? "success" : undefined)}
            className="w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Due date</Label>
            <DatePicker value={v.due_date} onChange={(d) => setV({ ...v, due_date: d })} allowClear placeholder="None" aria-label="Due date" />
          </div>
          {v.status === "paid" && (
            <div className="grid gap-2">
              <Label>Paid on</Label>
              <DatePicker value={v.paid_on} onChange={(d) => setV({ ...v, paid_on: d })} placeholder="Today" quick={false} aria-label="Paid on" />
            </div>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pay-note">Note</Label>
          <Textarea id="pay-note" rows={2} value={v.note ?? ""} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="e.g. First instalment, receipt no." />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {v.id ? "Save payment" : "Add payment"}
        </Button>
      </DialogFooter>
    </form>
  );
}
