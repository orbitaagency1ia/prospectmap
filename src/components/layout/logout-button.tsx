"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="pm-btn pm-btn-secondary rounded-[1rem] px-3.5"
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
