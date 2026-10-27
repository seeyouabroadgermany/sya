"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "@/components/app/settings/section";
import { changeMyPassword, updateMyProfile } from "@/lib/actions/account";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const [pending, start] = useTransition();
  return (
    <SettingsSection title="Your details" description={email}>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await updateMyProfile({ full_name: name, phone: tel });
            if (r.ok) toast.success("Saved");
            else toast.error(r.error);
          });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="acc-name">Name</Label>
          <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="acc-phone">Phone</Label>
          <Input id="acc-phone" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
        </div>
        <div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Save details
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

export function PasswordForm() {
  const [pw, setPw] = useState("");
  const [again, setAgain] = useState("");
  const [pending, start] = useTransition();
  return (
    <SettingsSection title="Password">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await changeMyPassword({ password: pw, confirm: again });
            if (r.ok) {
              toast.success("Password changed");
              setPw("");
              setAgain("");
            } else toast.error(r.error);
          });
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="acc-pw">New password</Label>
          <Input id="acc-pw" type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="acc-pw2">Type it again</Label>
          <Input id="acc-pw2" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required />
        </div>
        <div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Change password
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}

type Factor = { id: string; status: string; created_at: string };

export function TwoStep({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [setup, setSetup] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const verified = factors?.find((f) => f.status === "verified");

  async function load() {
    const { data } = await createClient().auth.mfa.listFactors();
    setFactors((data?.all ?? []) as Factor[]);
  }
  useEffect(() => {
    let alive = true;
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }) => alive && setFactors((data?.all ?? []) as Factor[]));
    return () => {
      alive = false;
    };
  }, []);

  function begin() {
    start(async () => {
      const supabase = createClient();
      // Clear any half-finished setup first.
      for (const f of factors ?? []) if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `SYB CRM ${Date.now()}` });
      if (error || !data) {
        toast.error("Couldn't start the setup. Try again.");
        return;
      }
      setSetup({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    });
  }

  function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!setup) return;
    start(async () => {
      const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: setup.id, code: code.replace(/\s/g, "") });
      if (error) {
        toast.error("That code didn't work. Try the newest one from your app.");
        return;
      }
      toast.success("Two-step login is on");
      setSetup(null);
      setCode("");
      await load();
      router.refresh();
    });
  }

  function turnOff() {
    if (!verified) return;
    start(async () => {
      const { error } = await createClient().auth.mfa.unenroll({ factorId: verified.id });
      if (error) {
        toast.error("Couldn't turn it off. Sign out and in again, then retry.");
        return;
      }
      toast.success("Two-step login is off");
      await load();
      router.refresh();
    });
  }

  return (
    <SettingsSection
      title="Two-step login"
      description={
        isAdmin
          ? "Strongly recommended for admins. After your password, you also type a 6-digit code from an app like Google Authenticator."
          : "Optional. After your password, you also type a 6-digit code from an app like Google Authenticator."
      }
    >
      {factors === null ? (
        <Loader2 className="size-4 animate-spin text-subtle" />
      ) : verified ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-success/40 bg-success-soft p-4">
          <ShieldCheck className="size-5 text-success" />
          <p className="flex-1 text-sm">Two-step login is on for your account.</p>
          <Button variant="outline" onClick={turnOff} disabled={pending}>
            Turn off
          </Button>
        </div>
      ) : setup ? (
        <form onSubmit={confirm} className="space-y-4 rounded-[12px] border border-line p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Open Google Authenticator, Microsoft Authenticator or a similar app on your phone.</li>
            <li>Add an account and scan this code.</li>
            <li>Type the 6-digit code the app shows.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="QR code for your authenticator app" className="size-44 rounded-lg bg-white p-2" />
          <p className="text-xs text-subtle">
            Can&apos;t scan? Enter this key in the app: <code className="break-all text-text">{setup.secret}</code>
          </p>
          <div className="flex gap-2">
            <Input aria-label="6-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code}
              onChange={(e) => setCode(e.target.value)} className="num max-w-40 text-center tracking-[0.3em]" />
            <Button type="submit" disabled={pending || code.replace(/\s/g, "").length !== 6}>
              {pending && <Loader2 className="animate-spin" />}
              Turn on
            </Button>
          </div>
        </form>
      ) : (
        <Button onClick={begin} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Set up two-step login
        </Button>
      )}
    </SettingsSection>
  );
}
