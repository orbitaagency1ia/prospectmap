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
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-5 md:pt-5">
        <div className="pm-shell mx-auto max-w-[1680px] overflow-hidden px-4 py-4 md:px-5 md:py-5 xl:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pm-kicker">ProspectMap</span>
                <span className="rounded-full border border-[var(--pm-border)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-[11px] font-medium text-[var(--pm-text-tertiary)]">
                  Sistema operativo comercial
                </span>
              </div>
              <div className="min-w-0">
                <p className="pm-title truncate text-[1.3rem] sm:text-[1.55rem]">
                  {profile?.company_name || "Empresa"}
                </p>
                <p className="pm-muted mt-1 text-sm">
                  {profile?.city_name ? `${profile.city_name} · ` : ""}
                  Prospección diaria con foco, claridad y cierre.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
              <span className="pm-badge hidden md:inline-flex">{profile?.city_name || "Ciudad principal"}</span>
              <LogoutButton />
            </div>
          </div>

          <div className="pm-shell-divider mt-5 border-t pt-4">
            <AppNav />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1680px] flex-1 flex-col px-3 pb-8 pt-4 md:px-5 md:pb-10 md:pt-5">
        {children}
      </div>
    </div>
  );
}
