import { SettingsWorkspace } from "@/components/layout/settings-workspace";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name,city_name,email")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <SettingsWorkspace
      userId={user.id}
      email={profile?.email ?? user.email ?? ""}
      initialCompany={profile?.company_name ?? ""}
      initialCity={profile?.city_name ?? ""}
    />
  );
}
