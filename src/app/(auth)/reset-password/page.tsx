import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetForm } from "@/components/app/auth/forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Choose a password" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login?link=expired");
  return (
    <>
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Choose a password</h1>
      <p className="mt-2 mb-8 text-sm text-subtle">You&apos;ll use it with {String(data.claims.email ?? "your email")} to sign in.</p>
      <ResetForm />
    </>
  );
}
