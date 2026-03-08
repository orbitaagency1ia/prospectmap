import { redirect } from "next/navigation";

import { isLocalAuthBypassEnabled } from "@/lib/local-auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/today");
  }

  redirect(isLocalAuthBypassEnabled() ? "/auto-login" : "/login");
}
