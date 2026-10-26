import type { Metadata } from "next";
import { LoginForm } from "@/components/app/auth/forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice = sp.disabled
    ? "Your account is switched off. Ask the admin to turn it back on."
    : sp.link === "expired"
      ? "That link has expired or was already used. Ask for a new one."
      : undefined;
  return (
    <>
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 mb-8 text-sm text-subtle">Use the email the admin invited you with.</p>
      <LoginForm next={next} notice={notice} />
    </>
  );
}
