import { AppShell } from "@/components/app/shell/app-shell";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const supabase = await createClient();
  const { data: counsellors } = me.isAdmin
    ? await supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name")
    : { data: [] };

  return (
    <AppShell user={{ fullName: me.fullName, email: me.email, isAdmin: me.isAdmin }} counsellors={counsellors ?? []}>
      {children}
    </AppShell>
  );
}
