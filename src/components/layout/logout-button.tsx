"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function LogoutButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={cn(
        compact ? "pm-utility-button" : "pm-btn pm-btn-secondary rounded-[1rem] px-3.5",
      )}
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.replace("/login");
      }}
    >
      <LogOut className="h-4 w-4" />
      <span className={compact ? "hidden sm:inline" : ""}>Salir</span>
    </button>
  );
}
