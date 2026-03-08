"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

import { PmNotice } from "../ui/pm";

function getLoginErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Esta instancia tiene activada confirmación por email en Supabase. Desactívala para acceso directo con contraseña.";
  }

  return "No pude iniciar sesión ahora mismo. Inténtalo de nuevo en unos segundos.";
}

export function LoginForm({ registered = false }: { registered?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const localBypassParam = searchParams.get("localBypass");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(getLoginErrorMessage(signInError.message));
      setLoading(false);
      return;
    }

    router.replace("/today");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--pm-primary)]">ProspectMap</p>
        <h1 className="text-2xl font-semibold text-white">Iniciar sesión</h1>
      </div>

      {registered ? (
        <PmNotice tone="emerald">
          Cuenta creada. Ya puedes entrar con tu email y contraseña.
        </PmNotice>
      ) : null}

      {localBypassParam === "missing_credentials" ? (
        <PmNotice tone="amber">
          Falta configurar `LOCAL_BYPASS_EMAIL` y `LOCAL_BYPASS_PASSWORD` en `.env.local`.
        </PmNotice>
      ) : null}

      {localBypassParam === "invalid_credentials" ? (
        <PmNotice tone="rose">
          El acceso automático local falló. Revisa email y contraseña en `.env.local`.
        </PmNotice>
      ) : null}

      {error ? <PmNotice tone="rose">{error}</PmNotice> : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-sm text-[var(--pm-text-secondary)]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
            placeholder="empresa@dominio.com"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-[var(--pm-text-secondary)]">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            placeholder="********"
          />
        </label>

        <button type="submit" disabled={loading} className="pm-btn pm-btn-primary w-full">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--pm-text-tertiary)]">
        ¿No tienes cuenta?{" "}
        <Link className="text-[var(--pm-primary)] hover:text-[var(--pm-primary-hover)]" href="/register">
          Crear empresa
        </Link>
      </p>
    </div>
  );
}
