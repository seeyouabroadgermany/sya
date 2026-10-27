"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function MfaChallenge() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const supabase = createClient();
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp.find((f) => f.status === "verified");
      if (!factor) return router.replace("/");
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.replace(/\s/g, "") });
      if (error) return setError("That code didn't work. Check your authenticator app and try the newest code.");
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="mfa-code">6-digit code</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="num text-center text-lg tracking-[0.3em]"
          autoFocus
          required
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending || code.replace(/\s/g, "").length !== 6}>
        {pending && <Loader2 className="animate-spin" />}
        Continue
      </Button>
      <a href="/auth/signout" className="block text-center text-sm text-subtle hover:text-text">
        Sign out
      </a>
    </form>
  );
}
