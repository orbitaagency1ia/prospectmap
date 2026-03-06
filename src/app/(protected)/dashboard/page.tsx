import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { isProfileComplete, requireUser } from "@/lib/auth";
import { buildDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,company_name,city_name,city_lat,city_lng,email,created_at,updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!isProfileComplete(profile)) {
    redirect("/onboarding");
  }

  const [{ data: businesses }, { data: notes }] = await Promise.all([
    supabase.from("businesses").select("*").order("updated_at", { ascending: false }),
    supabase
      .from("business_notes")
      .select("id,business_id,note_text,created_at,businesses(name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const parsedNotes = (notes ?? []).map((note) => {
    const relation = note.businesses as { name?: string } | { name?: string }[] | null;

    return {
      id: note.id,
      business_id: note.business_id,
      note_text: note.note_text,
      created_at: note.created_at,
      business_name: Array.isArray(relation) ? relation[0]?.name : relation?.name,
    };
  });

  const data = buildDashboardData({
    businesses: businesses ?? [],
    notes: parsedNotes,
  });

  return <DashboardClient data={data} />;
}
