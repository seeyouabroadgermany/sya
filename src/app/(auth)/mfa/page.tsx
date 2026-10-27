import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaChallenge } from "@/components/app/auth/mfa-challenge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Two-step login" };

export default async function MfaPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return (
    <>
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Enter your code</h1>
      <p className="mt-2 mb-8 text-sm text-subtle">Open your authenticator app and type the 6-digit code for SYB CRM.</p>
      <MfaChallenge />
    </>
  );
}
