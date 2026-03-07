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
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 px-3 pt-3 lg:px-5 lg:pt-5">
        <div className="mx-auto flex w-full max-w-[1620px] flex-col gap-3 rounded-[2rem] border border-[var(--pm-border)] bg-[rgba(14,17,22,0.74)] px-4 py-4 shadow-[var(--pm-shadow-float)] backdrop-blur-2xl lg:gap-4 lg:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
              <div className="min-w-0 rounded-[1.8rem] border border-[var(--pm-border)] bg-[linear-gradient(180deg,rgba(30,35,44,0.72),rgba(19,22,28,0.78))] px-4 py-3 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[rgba(246,162,76,0.92)]">ProspectMap</p>
                  <span className="pm-badge hidden sm:inline-flex">Sistema operativo comercial</span>
                </div>
                <p className="mt-1 truncate text-base font-semibold text-[var(--pm-text)]">{profile?.company_name || "Empresa"}</p>
                <p className="text-sm text-[var(--pm-text-secondary)]">
                  {profile?.city_name ? `${profile.city_name} · ` : ""}
                  Operación diaria con foco y cierre
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

      <div className="mx-auto flex w-full max-w-[1620px] flex-1 flex-col px-0 pb-8 pt-3 lg:px-5 lg:pb-10 lg:pt-5">
        {children}
      </div>
    </div>
  );
}
