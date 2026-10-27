import type { Metadata } from "next";
import { GeneralSettings } from "@/components/app/settings/lists";
import { siteUrl } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leads and emails" };

export default async function GeneralSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("round_robin_enabled, digest_enabled").eq("id", 1).single();
  return <GeneralSettings roundRobin={data?.round_robin_enabled ?? false} digest={data?.digest_enabled ?? true} applyUrl={siteUrl("/apply")} />;
}
