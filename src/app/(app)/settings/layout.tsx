import { PageHeader } from "@/components/app/page-header";
import { SettingsNav } from "@/components/app/settings/settings-nav";
import { requireAdmin } from "@/lib/auth";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Settings" description="Change how the CRM works for the whole team. No code needed." />
      <div className="grid grid-cols-1 gap-6 px-4 pb-16 md:grid-cols-[200px_minmax(0,1fr)] md:px-6">
        <aside className="min-w-0 md:sticky md:top-6 md:self-start">
          <SettingsNav />
        </aside>
        <div className="min-w-0 max-w-3xl">{children}</div>
      </div>
    </>
  );
}
