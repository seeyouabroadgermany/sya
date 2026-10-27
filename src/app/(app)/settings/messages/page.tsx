import type { Metadata } from "next";
import { TemplateSettings } from "@/components/app/settings/lists";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "WhatsApp messages" };

export default async function MessageSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("message_templates").select("id, name, body").order("position");
  return <TemplateSettings templates={data ?? []} />;
}
