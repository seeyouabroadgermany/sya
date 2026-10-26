import type { Metadata } from "next";
import { ForgotForm } from "@/components/app/auth/forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 mb-8 text-sm text-subtle">We&apos;ll email you a link to choose a new one.</p>
      <ForgotForm />
    </>
  );
}
