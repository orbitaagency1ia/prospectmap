import { redirect } from "next/navigation";

import { AccountProfileForm } from "@/components/layout/account-profile-form";
import { isProfileComplete, requireUser } from "@/lib/auth";

export default async function OnboardingPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name,city_name,email,city_lat,city_lng,id,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  const existingProfile = profile;

  if (isProfileComplete(profile)) {
    redirect("/today");
  }

  return (
    <AccountProfileForm
      mode="onboarding"
      userId={user.id}
      email={existingProfile?.email ?? user.email ?? ""}
      initialCompany={existingProfile?.company_name ?? ""}
      initialCity={existingProfile?.city_name ?? ""}
    />
  );
}
