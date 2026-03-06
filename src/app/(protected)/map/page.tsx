import { redirect } from "next/navigation";

import { MapWorkspace } from "@/components/map/map-workspace";
import { isProfileComplete, requireUser } from "@/lib/auth";

export default async function MapPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  return <MapWorkspace profile={profile} />;
}
