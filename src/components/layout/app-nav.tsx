"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Map, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/settings", label: "Cuenta", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
              active
                ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:text-slate-100",
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
