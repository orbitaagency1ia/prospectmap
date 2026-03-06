"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { CitySuggestion } from "@/lib/types";

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
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.replace("/map");
      router.refresh();
      return;
    }

    router.replace("/login?registered=1");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">ProspectMap</p>
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
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
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
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
            placeholder="Mínimo 8 caracteres"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <Link className="text-cyan-300 hover:text-cyan-200" href="/login">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
