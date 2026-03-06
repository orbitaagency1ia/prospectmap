import { redirect } from "next/navigation";

import { PipelineClient } from "@/components/prospects/pipeline-client";
import { isProfileComplete, requireUser } from "@/lib/auth";

export default async function PipelinePage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return <PipelineClient profile={profile} />;
}
