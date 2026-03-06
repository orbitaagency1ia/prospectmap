import { redirect } from "next/navigation";

import { OnboardingWorkspace } from "@/components/layout/onboarding-workspace";
import { isProfileComplete, requireUser } from "@/lib/auth";
import { isAccountCommercialProfileComplete, parseAccountCommercialProfileRow } from "@/lib/prospect-intelligence";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  const [{ data: profile }, { data: accountProfileRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("company_name,city_name,email,city_lat,city_lng,id,created_at,updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("account_profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const profileComplete = isProfileComplete(profile);
  const accountProfile = parseAccountCommercialProfileRow(accountProfileRow);

  if (profileComplete && isAccountCommercialProfileComplete(accountProfile)) {
    redirect("/today");
  }

  return (
    <OnboardingWorkspace
      userId={user.id}
      email={profile?.email ?? user.email ?? ""}
      initialCompany={profile?.company_name ?? ""}
      initialCity={profile?.city_name ?? ""}
      profileComplete={profileComplete}
    />
  );
}
