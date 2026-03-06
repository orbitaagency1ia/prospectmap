import { redirect } from "next/navigation";

import { RankingClient } from "@/components/prospects/ranking-client";
import { isProfileComplete, requireUser } from "@/lib/auth";

export default async function RankingPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return <RankingClient profile={profile} />;
}
