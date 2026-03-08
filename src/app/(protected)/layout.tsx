import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, MapPin, Settings } from "lucide-react";

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
        <div className="mx-auto max-w-[1740px]">
          <div className="pm-shell pm-app-header overflow-hidden">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto] xl:items-center">
              <div className="pm-brand-lockup">
                <div className="pm-brand-mark">
                  <span className="pm-kicker">ProspectMap</span>
                  <span className="pm-context-pill">Commercial OS</span>
                </div>
                <div className="min-w-0">
                  <p className="pm-title truncate text-[1.28rem] leading-tight sm:text-[1.48rem]">
                    {profile?.company_name || "Empresa"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--pm-text-secondary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[var(--pm-text-tertiary)]" />
                      {profile?.city_name || "Ciudad principal"}
                    </span>
                    <span className="hidden h-1 w-1 rounded-full bg-[var(--pm-text-tertiary)] sm:inline-block" />
                    <span className="pm-muted">Foco diario, territorio y cierre.</span>
                  </div>
                </div>
              </div>

              <div className="hidden xl:block">
                <AppNav showMobile={false} />
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start xl:justify-end">
                <Link href="/dashboard" className="pm-utility-button">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden lg:inline">Analítica</span>
                </Link>
                <Link href="/settings" className="pm-utility-button">
                  <Settings className="h-4 w-4" />
                  <span className="hidden lg:inline">Configuración</span>
                </Link>
                <LogoutButton compact />
              </div>
            </div>

            <div className="pm-shell-divider mt-5 border-t pt-4 xl:hidden">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--pm-text-tertiary)]">Navegación principal</p>
                  <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="pm-utility-button min-h-[2.6rem] px-3">
                      <BarChart3 className="h-4 w-4" />
                      <span className="sr-only">Analítica</span>
                    </Link>
                    <Link href="/settings" className="pm-utility-button min-h-[2.6rem] px-3">
                      <Settings className="h-4 w-4" />
                      <span className="sr-only">Configuración</span>
                    </Link>
                  </div>
                </div>
                <AppNav showDesktop={false} />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1740px] flex-1 flex-col px-3 pb-8 pt-4 md:px-5 md:pb-10 md:pt-5">
        {children}
      </div>
    </div>
  );
}
