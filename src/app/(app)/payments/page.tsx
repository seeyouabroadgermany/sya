import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PaymentsView } from "@/components/app/payments/payments-view";
import { getMe } from "@/lib/auth";
import { getIntakes, getPayments } from "@/lib/data";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const me = await getMe();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const [payments, intakes] = await Promise.all([
    getPayments({ intake: one("intake"), status: one("status"), kind: one("kind") }),
    getIntakes(),
  ]);
  return (
    <>
      <PageHeader
        title="Payments"
        description={me.isAdmin ? "Agency, university and nostrification fees across all students." : "Payments for your students."}
      />
      <Suspense>
        <PaymentsView key={JSON.stringify(sp)} payments={payments} intakes={intakes} />
      </Suspense>
    </>
  );
}
