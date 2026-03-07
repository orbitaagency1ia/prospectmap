"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { CitySuggestion } from "@/lib/types";

function getRegisterErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Ese email ya está en uso. Prueba con otro o entra en tu cuenta.";
  }

  if (normalized.includes("database error")) {
    return "No pude crear la cuenta con esta configuración. Revisa Auth y vuelve a intentarlo.";
  }

  return "No pude crear la cuenta ahora mismo. Inténtalo de nuevo en unos segundos.";
}

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [cityOptions, setCityOptions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCity = useMemo(
    () =>
      cityOptions.find(
        (option) =>
          option.displayName.toLowerCase() === cityInput.toLowerCase() ||
          option.cityName.toLowerCase() === cityInput.toLowerCase(),
      ) ?? null,
    [cityInput, cityOptions],
  );

  useEffect(() => {
    if (cityInput.trim().length < 2) {
      setCityOptions([]);
      return;
    }

    const handle = setTimeout(async () => {
      setCityLoading(true);
      try {
        const response = await fetch(`/api/geocode/city?q=${encodeURIComponent(cityInput.trim())}`);
        if (!response.ok) {
          throw new Error("No se pudo buscar la ciudad.");
        }

        const payload = (await response.json()) as { suggestions: CitySuggestion[] };
        setCityOptions(payload.suggestions ?? []);
      } catch {
        setCityOptions([]);
      } finally {
        setCityLoading(false);
      }
    }, 450);

    return () => clearTimeout(handle);
  }, [cityInput]);

  const resolveCity = async (): Promise<CitySuggestion | null> => {
    if (selectedCity) {
      return selectedCity;
    }

    const response = await fetch(`/api/geocode/city?q=${encodeURIComponent(cityInput.trim())}&limit=1`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { suggestions: CitySuggestion[] };
    return payload.suggestions?.[0] ?? null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const city = await resolveCity();
    if (!city) {
      setError("No pude ubicar la ciudad. Elige una sugerencia válida.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName.trim(),
          city_name: city.cityName,
          city_lat: city.lat,
          city_lng: city.lng,
        },
      },
    });

    if (signUpError) {
      setError(getRegisterErrorMessage(signUpError.message));
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/today");
      router.refresh();
      return;
    }

    router.replace("/login?registered=1");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--pm-primary)]">ProspectMap</p>
        <h1 className="text-2xl font-semibold text-white">Crear empresa</h1>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-700/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-200">{error}</div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Nombre de empresa</span>
          <input
            type="text"
            required
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className="field"
            placeholder="Orbita Agency"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Ciudad principal</span>
          <input
            type="text"
            required
            list="city-suggestions"
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
            className="field"
            placeholder="Madrid"
          />
          <datalist id="city-suggestions">
            {cityOptions.map((option) => (
              <option key={`${option.cityName}-${option.lat}-${option.lng}`} value={option.cityName}>
                {option.displayName}
              </option>
            ))}
          </datalist>
          <p className="text-xs text-slate-500">{cityLoading ? "Buscando ciudades..." : "España por defecto"}</p>
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="field"
            placeholder="contacto@tuempresa.com"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-slate-300">Contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="field"
            placeholder="Mínimo 8 caracteres"
          />
        </label>

        <button type="submit" disabled={loading} className="pm-btn pm-btn-primary w-full">
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <Link className="text-[var(--pm-primary)] hover:text-[var(--pm-primary-hover)]" href="/login">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
