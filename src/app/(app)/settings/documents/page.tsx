import type { Metadata } from "next";
import { DocumentSettings } from "@/components/app/settings/lists";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("document_types").select("id, name, required, active, position").order("position");
  return <DocumentSettings docs={data ?? []} />;
}
