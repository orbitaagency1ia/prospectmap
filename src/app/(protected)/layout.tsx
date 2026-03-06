import { redirect } from "next/navigation";

import { AppNav } from "@/components/layout/app-nav";
import { LogoutButton } from "@/components/layout/logout-button";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name,city_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/90">ProspectMap</p>
              <p className="text-sm text-slate-400">
                {profile?.company_name || "Empresa"}
                {profile?.city_name ? ` · ${profile.city_name}` : ""}
              </p>
            </div>
            <AppNav />
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-0 lg:px-6">{children}</div>
    </div>
  );
}
