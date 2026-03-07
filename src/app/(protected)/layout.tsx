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
      <header className="sticky top-0 z-40 border-b border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.94)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-4 lg:gap-4 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
              <div className="rounded-[28px] border border-[rgba(30,51,80,0.92)] bg-[rgba(13,23,40,0.84)] px-4 py-3 shadow-[0_18px_46px_rgba(3,9,18,0.3)]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(58,190,249,0.84)]">ProspectMap</p>
                <p className="mt-1 text-base font-semibold text-[var(--pm-text)]">{profile?.company_name || "Empresa"}</p>
                <p className="text-sm text-[var(--pm-text-secondary)]">
                {profile?.city_name ? `${profile.city_name} · ` : ""}
                Sistema operativo comercial
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <LogoutButton />
            </div>
          </div>
          <AppNav />
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-0 pb-8 lg:px-6 lg:pb-10">{children}</div>
    </div>
  );
}
