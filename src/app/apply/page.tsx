import type { Metadata } from "next";
import { connection } from "next/server";
import { ApplyForm } from "@/components/app/apply/apply-form";
import { Logo } from "@/components/app/logo";

export const metadata: Metadata = {
  title: { absolute: "Study in the Czech Republic | See You Abroad" },
  description: "Tell us about your plans. A See You Abroad counsellor will call you within one working day.",
  robots: { index: true, follow: true },
};

// When the page was served; the form rejects submissions faster than a person could type.
function servedAt() {
  return Date.now();
}

export default async function ApplyPage() {
  await connection(); // render per visit, so the spam timer starts when the page opens
  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-16 sm:px-8 sm:pt-12">
        <Logo className="h-11" />
        <header className="mt-12 mb-10 sm:mt-16">
          <h1 className="text-[28px] leading-[1.15] font-semibold tracking-tight sm:text-4xl">
            Study in the Czech Republic
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-subtle">
            Bachelor&apos;s and Master&apos;s degrees at Czech universities, with help from first call to visa. Tell us a
            little about yourself and we&apos;ll call you back.
          </p>
        </header>
        <ApplyForm startedAt={servedAt()} />
        <p className="mt-16 text-xs text-subtle">See You Abroad, Kozhikode, Kerala</p>
      </div>
    </div>
  );
}
