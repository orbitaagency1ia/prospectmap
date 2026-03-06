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
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 shadow-[0_16px_40px_rgba(2,6,23,0.28)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/90">ProspectMap</p>
              <p className="mt-1 text-base font-semibold text-slate-100">{profile?.company_name || "Empresa"}</p>
              <p className="text-sm text-slate-400">
                {profile?.city_name ? `${profile.city_name} · ` : ""}
                Sistema operativo comercial
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
