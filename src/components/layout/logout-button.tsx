"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(30,51,80,0.92)] bg-[rgba(13,23,40,0.82)] px-3 py-2.5 text-sm font-medium text-[var(--pm-text)] transition hover:border-[rgba(58,190,249,0.42)] hover:bg-[rgba(18,32,51,0.96)]"
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace("/login");
      }}
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </button>
  );
}
