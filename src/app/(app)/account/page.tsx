import type { Metadata } from "next";
import { PasswordForm, ProfileForm, TwoStep } from "@/components/app/account";
import { PageHeader } from "@/components/app/page-header";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await getMe();
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("phone").eq("id", me.id).single();
  return (
    <>
      <PageHeader title="My account" />
      <div className="max-w-3xl space-y-10 px-4 pb-16 md:px-6">
        <ProfileForm fullName={me.fullName} phone={data?.phone ?? ""} email={me.email ?? ""} />
        <TwoStep isAdmin={me.isAdmin} />
        <PasswordForm />
      </div>
    </>
  );
}
