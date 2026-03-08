"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Crosshair, HandCoins, ListOrdered, Map } from "lucide-react";

import { cn } from "@/lib/utils";

const primaryLinks = [
  { href: "/today", label: "Centro", mobileLabel: "Hoy", icon: Compass },
  { href: "/attack", label: "Ataque", mobileLabel: "Ataque", icon: Crosshair },
  { href: "/map", label: "Territorio", mobileLabel: "Mapa", icon: Map },
  { href: "/ranking", label: "Prioridades", mobileLabel: "Top", icon: ListOrdered },
  { href: "/pipeline", label: "Pipeline", mobileLabel: "Cierre", icon: HandCoins },
];

export function AppNav({
  showDesktop = true,
  showMobile = true,
}: {
  showDesktop?: boolean;
  showMobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      <nav className={cn("xl:items-center xl:justify-center", showDesktop ? "hidden xl:flex" : "hidden")}>
        <div className="pm-nav-stage">
          {primaryLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={cn("pm-nav-link group", active && "pm-nav-link-active")}
              >
                <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-[1.04]" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className={cn("xl:hidden", !showMobile && "hidden")}>
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="pm-mobile-stage">
            {primaryLinks.map(({ href, label, mobileLabel, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={cn("pm-mobile-nav-link", active && "pm-mobile-nav-link-active")}
                >
                  <Icon className="h-[16px] w-[16px]" />
                  <span className="truncate text-xs font-medium tracking-[0.01em]">{mobileLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
