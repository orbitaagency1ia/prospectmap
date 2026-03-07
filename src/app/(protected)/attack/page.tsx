import { redirect } from "next/navigation";

import { AttackWorkspace } from "@/components/attack/attack-workspace";
import { isProfileComplete, requireUser } from "@/lib/auth";

export default async function AttackPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return <AttackWorkspace profile={profile} />;
}
