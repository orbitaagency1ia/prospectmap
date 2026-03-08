import Link from "next/link";
import { redirect } from "next/navigation";

import { PmNotice } from "@/components/ui/pm";
import {
  getLocalBypassCredentials,
  getSafeNextPath,
  isLocalAuthBypassEnabled,
} from "@/lib/local-auth-bypass";
import { createClient } from "@/lib/supabase/server";

export default async function AutoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isLocalAuthBypassEnabled()) {
    redirect("/login");
  }

  const params = await searchParams;
  const nextPath = getSafeNextPath(params.next, "/today");
  const { email, password } = getLocalBypassCredentials();

  if (!email || !password) {
    return (
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--pm-primary)]">ProspectMap local</p>
        <h1 className="text-2xl font-semibold text-white">Falta configurar acceso automático</h1>
        <PmNotice tone="amber">
          Define `LOCAL_BYPASS_EMAIL` y `LOCAL_BYPASS_PASSWORD` en `.env.local` para entrar sin login manual.
        </PmNotice>
        <Link href="/login" className="pm-btn pm-btn-secondary w-full">
          Ir a login manual
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return (
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--pm-primary)]">ProspectMap local</p>
          <h1 className="text-2xl font-semibold text-white">No pude entrar automáticamente</h1>
          <PmNotice tone="rose">
            Revisa `LOCAL_BYPASS_EMAIL` y `LOCAL_BYPASS_PASSWORD` en `.env.local`.
          </PmNotice>
          <Link href="/login" className="pm-btn pm-btn-secondary w-full">
            Ir a login manual
          </Link>
        </div>
      );
    }
  }

  redirect(nextPath);
}
