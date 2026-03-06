import { redirect } from "next/navigation";

import { TodayClient } from "@/components/prospects/today-client";
import { isProfileComplete, requireUser } from "@/lib/auth";

export default async function TodayPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return <TodayClient profile={profile} />;
}
