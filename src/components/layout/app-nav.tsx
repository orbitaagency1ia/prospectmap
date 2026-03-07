"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Compass, Crosshair, HandCoins, ListOrdered, Map, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/today", label: "Centro de control", icon: Compass },
  { href: "/attack", label: "Ataque", icon: Crosshair },
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
      <nav className="pm-toolbar hidden flex-wrap items-center gap-2 rounded-[1.5rem] p-1.5 lg:flex">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-2 rounded-[1.1rem] border px-3.5 py-2.5 text-sm transition",
                active
                  ? "border-[rgba(246,162,76,0.24)] bg-[linear-gradient(180deg,rgba(239,139,53,0.18),rgba(239,139,53,0.08))] text-[var(--pm-text)] shadow-[0_16px_32px_rgba(239,139,53,0.14)]"
                  : "border-transparent bg-transparent text-[var(--pm-text-secondary)] hover:border-[var(--pm-border)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--pm-text)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav className="-mx-1 overflow-x-auto pb-1 lg:hidden">
        <div className="pm-toolbar flex min-w-max gap-2 rounded-[1.4rem] p-1.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex min-h-[48px] items-center gap-2 rounded-[1.05rem] border px-3.5 py-2 text-sm whitespace-nowrap transition",
                  active
                    ? "border-[rgba(246,162,76,0.24)] bg-[linear-gradient(180deg,rgba(239,139,53,0.18),rgba(239,139,53,0.08))] text-[var(--pm-text)]"
                    : "border-transparent bg-transparent text-[var(--pm-text-secondary)] hover:border-[var(--pm-border)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--pm-text)]",
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
