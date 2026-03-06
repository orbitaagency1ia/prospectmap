"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Compass, ListOrdered, Map, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/today", label: "Hoy", icon: Compass },
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/ranking", label: "Ranking", icon: ListOrdered },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/settings", label: "Cuenta", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1.5 shadow-[0_12px_34px_rgba(2,6,23,0.22)]">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
              active
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.1)]"
                : "border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-950/70 hover:text-slate-100",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
