"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Compass, HandCoins, ListOrdered, Map, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/today", label: "Centro de control", icon: Compass },
  { href: "/map", label: "Territorio", icon: Map },
  { href: "/ranking", label: "Prioridades", icon: ListOrdered },
  { href: "/pipeline", label: "Pipeline", icon: HandCoins },
  { href: "/dashboard", label: "Analítica", icon: BarChart3 },
  { href: "/settings", label: "Configuración", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden flex-wrap items-center gap-2 rounded-[24px] border border-[rgba(30,51,80,0.88)] bg-[rgba(13,23,40,0.82)] p-1.5 shadow-[0_18px_44px_rgba(3,9,18,0.26)] lg:flex">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm transition",
                active
                  ? "border-[rgba(242,138,46,0.45)] bg-[rgba(242,138,46,0.14)] text-[var(--pm-text)] shadow-[0_0_0_1px_rgba(242,138,46,0.08)]"
                  : "border-transparent bg-transparent text-[var(--pm-text-secondary)] hover:border-[rgba(30,51,80,0.92)] hover:bg-[rgba(7,17,31,0.72)] hover:text-[var(--pm-text)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav className="-mx-1 overflow-x-auto pb-1 lg:hidden">
        <div className="flex min-w-max gap-2 rounded-[24px] border border-[rgba(30,51,80,0.88)] bg-[rgba(13,23,40,0.82)] p-1.5 shadow-[0_18px_44px_rgba(3,9,18,0.26)]">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex min-h-[46px] items-center gap-2 rounded-2xl border px-3 py-2 text-sm whitespace-nowrap transition",
                  active
                    ? "border-[rgba(242,138,46,0.45)] bg-[rgba(242,138,46,0.14)] text-[var(--pm-text)]"
                    : "border-transparent bg-transparent text-[var(--pm-text-secondary)] hover:border-[rgba(30,51,80,0.92)] hover:bg-[rgba(7,17,31,0.72)] hover:text-[var(--pm-text)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
