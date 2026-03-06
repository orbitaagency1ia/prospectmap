import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

export function isProfileComplete(profile: ProfileRow | null): profile is ProfileRow {
  return Boolean(
    profile &&
      profile.company_name.trim() &&
      profile.city_name.trim() &&
      Number.isFinite(profile.city_lat) &&
      Number.isFinite(profile.city_lng),
  );
}
