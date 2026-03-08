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
      <nav className="hidden items-center justify-between gap-3 xl:flex">
        <div className="flex min-w-0 items-center gap-1.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "pm-nav-link group",
                  active && "pm-nav-link-active",
                )}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-[1.05]" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="xl:hidden">
        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-2 px-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "pm-nav-link min-h-[46px] rounded-[1.05rem] px-3.5 text-sm",
                    active && "pm-nav-link-active",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
