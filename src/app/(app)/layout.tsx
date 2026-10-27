import { AppShell } from "@/components/app/shell/app-shell";
import { getMe } from "@/lib/auth";
import { getNavCounts } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const supabase = await createClient();
  const [{ data: counsellors }, counts] = await Promise.all([
    me.isAdmin
      ? supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    getNavCounts(me.isAdmin),
  ]);

  return (
    <AppShell user={{ fullName: me.fullName, email: me.email, isAdmin: me.isAdmin }} counsellors={counsellors ?? []} counts={counts}>
      {children}
    </AppShell>
  );
}
