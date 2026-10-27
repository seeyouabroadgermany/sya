import type { Metadata } from "next";
import { PipelineSettings } from "@/components/app/settings/pipeline";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stages and steps" };

export default async function PipelineSettingsPage() {
  const supabase = await createClient();
  const [{ data: stages }, { data: steps }] = await Promise.all([
    supabase.from("stages").select("*").eq("country", "CZ").order("position"),
    supabase.from("stage_steps").select("*").order("position"),
  ]);
  return <PipelineSettings stages={stages ?? []} steps={steps ?? []} />;
}
