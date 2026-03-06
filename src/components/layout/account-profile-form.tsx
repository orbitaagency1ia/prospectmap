"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { CitySuggestion } from "@/lib/types";

type Props = {
  mode: "onboarding" | "settings";
  userId: string;
  email: string;
  initialCompany: string;
  initialCity: string;
};

export function AccountProfileForm({ mode, userId, email, initialCompany, initialCity }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [company, setCompany] = useState(initialCompany);
  const [city, setCity] = useState(initialCity);
  const [cityOptions, setCityOptions] = useState<CitySuggestion[]>([]);
  const [cityLoading, setCityLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (city.trim().length < 2) {
      setCityOptions([]);
      return;
    }

    const handle = setTimeout(async () => {
      setCityLoading(true);
      try {
        const response = await fetch(`/api/geocode/city?q=${encodeURIComponent(city.trim())}`);
        const payload = (await response.json()) as { suggestions: CitySuggestion[] };
        setCityOptions(payload.suggestions ?? []);
      } catch {
        setCityOptions([]);
      } finally {
        setCityLoading(false);
      }
    }, 450);

    return () => clearTimeout(handle);
  }, [city]);

  const resolveCity = async () => {
    const match =
      cityOptions.find((option) => option.cityName.toLowerCase() === city.trim().toLowerCase()) ??
      cityOptions.find((option) => option.displayName.toLowerCase() === city.trim().toLowerCase()) ??
      null;

    if (match) return match;

    const response = await fetch(`/api/geocode/city?q=${encodeURIComponent(city.trim())}&limit=1`);
    if (!response.ok) return null;

    const payload = (await response.json()) as { suggestions: CitySuggestion[] };
    return payload.suggestions?.[0] ?? null;
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const cityData = await resolveCity();
    if (!cityData) {
      setError("No se pudo localizar la ciudad. Usa una sugerencia válida.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      company_name: company.trim(),
      city_name: cityData.cityName,
      city_lat: cityData.lat,
      city_lng: cityData.lng,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    setMessage(mode === "onboarding" ? "Perfil completado." : "Perfil actualizado.");
    setLoading(false);

    if (mode === "onboarding") {
      router.replace("/today");
    } else {
      router.refresh();
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordLoading(true);
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      setPasswordLoading(false);
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({ password });

    if (passwordError) {
      setError(passwordError.message);
      setPasswordLoading(false);
      return;
    }

    setPassword("");
    setMessage("Contraseña actualizada.");
    setPasswordLoading(false);
  };

  return (
    <div className="space-y-6 px-4 py-4 lg:px-0">
      <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
        <h1 className="text-lg font-semibold text-slate-100">
          {mode === "onboarding" ? "Completa tu empresa" : "Configuración de cuenta"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === "onboarding"
            ? "Necesitamos estos datos para centrar el mapa y cargar negocios reales desde tu ciudad."
            : "Actualiza tu empresa y ciudad principal."}
        </p>

        {message ? (
          <p className="mt-3 rounded-lg border border-emerald-700/70 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-200">{message}</p>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-700/70 bg-rose-900/30 px-3 py-2 text-sm text-rose-200">{error}</p>
        ) : null}

        <form className="mt-4 space-y-3" onSubmit={handleSaveProfile}>
          <label className="block space-y-1">
            <span className="text-sm text-slate-300">Empresa</span>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-slate-300">Ciudad principal</span>
            <input
              value={city}
              list="settings-city-list"
              onChange={(event) => setCity(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
            <datalist id="settings-city-list">
              {cityOptions.map((option) => (
                <option key={`${option.cityName}-${option.lat}-${option.lng}`} value={option.cityName}>
                  {option.displayName}
                </option>
              ))}
            </datalist>
            <p className="text-xs text-slate-500">{cityLoading ? "Buscando ciudad..." : "España por defecto"}</p>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : mode === "onboarding" ? "Guardar y entrar" : "Guardar perfil"}
          </button>
        </form>
      </section>

      {mode === "settings" ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
          <h2 className="text-base font-semibold text-slate-100">Cambiar contraseña</h2>
          <form className="mt-3 space-y-3" onSubmit={handleChangePassword}>
            <label className="block space-y-1">
              <span className="text-sm text-slate-300">Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            <button
              type="submit"
              disabled={passwordLoading}
              className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordLoading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
