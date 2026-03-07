"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { CitySuggestion } from "@/lib/types";

import { PmNotice, PmPanel, PmSectionHeader } from "../ui/pm";

function getProfileSaveErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("duplicate")) {
    return "No pude actualizar el perfil con esos datos. Revisa la información e inténtalo de nuevo.";
  }

  return "No pude guardar los cambios ahora mismo. Inténtalo de nuevo en unos segundos.";
}

function getPasswordErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("same password")) {
    return "Elige una contraseña distinta a la actual.";
  }

  return "No pude actualizar la contraseña ahora mismo. Inténtalo de nuevo en unos segundos.";
}

type Props = {
  mode: "onboarding" | "settings";
  userId: string;
  email: string;
  initialCompany: string;
  initialCity: string;
  redirectPath?: string | null;
};

export function AccountProfileForm({ mode, userId, email, initialCompany, initialCity, redirectPath }: Props) {
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
      setError(getProfileSaveErrorMessage(profileError.message));
      setLoading(false);
      return;
    }

    setMessage(mode === "onboarding" ? "Perfil completado." : "Perfil actualizado.");
    setLoading(false);

    if (mode === "onboarding") {
      const nextPath = redirectPath === undefined ? "/today" : redirectPath;

      if (nextPath) {
        router.replace(nextPath);
      } else {
        router.refresh();
      }
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
      setError(getPasswordErrorMessage(passwordError.message));
      setPasswordLoading(false);
      return;
    }

    setPassword("");
    setMessage("Contraseña actualizada.");
    setPasswordLoading(false);
  };

  return (
    <div className="space-y-6">
      <PmPanel className="p-4 sm:p-5">
        <PmSectionHeader
          title={mode === "onboarding" ? "Completa tu empresa" : "Perfil de cuenta"}
          description={
            mode === "onboarding"
              ? "Necesitamos estos datos para centrar el mapa y cargar negocios reales desde tu ciudad."
              : "Actualiza empresa, ciudad principal y credenciales básicas."
          }
        />

        {message ? <PmNotice tone="emerald" className="mt-4">{message}</PmNotice> : null}

        {error ? <PmNotice tone="rose" className="mt-4">{error}</PmNotice> : null}

        <form className="mt-5 space-y-4" onSubmit={handleSaveProfile}>
          <label className="block space-y-2">
            <span className="pm-caption block uppercase tracking-[0.12em] text-[var(--pm-text-tertiary)]">Empresa</span>
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              required
              className="field"
            />
          </label>

          <label className="block space-y-2">
            <span className="pm-caption block uppercase tracking-[0.12em] text-[var(--pm-text-tertiary)]">Ciudad principal</span>
            <input
              value={city}
              list="settings-city-list"
              onChange={(event) => setCity(event.target.value)}
              required
              className="field"
            />
            <datalist id="settings-city-list">
              {cityOptions.map((option) => (
                <option key={`${option.cityName}-${option.lat}-${option.lng}`} value={option.cityName}>
                  {option.displayName}
                </option>
              ))}
            </datalist>
            <p className="pm-caption">{cityLoading ? "Buscando ciudad..." : "España por defecto"}</p>
          </label>

          <button type="submit" disabled={loading} className="pm-btn pm-btn-primary w-full sm:w-auto">
            {loading ? "Guardando..." : mode === "onboarding" ? "Guardar y continuar" : "Guardar perfil"}
          </button>
        </form>
      </PmPanel>

      {mode === "settings" ? (
        <PmPanel className="p-4 sm:p-5">
          <PmSectionHeader title="Cambiar contraseña" description="Actualiza la contraseña de acceso de esta cuenta." />

          <form className="mt-4 space-y-4" onSubmit={handleChangePassword}>
            <label className="block space-y-2">
              <span className="pm-caption block uppercase tracking-[0.12em] text-[var(--pm-text-tertiary)]">Nueva contraseña</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                className="field"
                placeholder="Mínimo 8 caracteres"
              />
            </label>

            <button type="submit" disabled={passwordLoading} className="pm-btn pm-btn-secondary w-full sm:w-auto">
              {passwordLoading ? "Actualizando..." : "Actualizar contraseña"}
            </button>
          </form>
        </PmPanel>
      ) : null}
    </div>
  );
}
