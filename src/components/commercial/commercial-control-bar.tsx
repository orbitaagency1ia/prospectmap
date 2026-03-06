"use client";

import { MonitorPlay, Network } from "lucide-react";

import { VERTICAL_CONFIGS } from "@/lib/prospect-intelligence";
import type { AccountCommercialSettings, VerticalId } from "@/lib/prospect-intelligence";
import { cn } from "@/lib/utils";

type Props = {
  settings: AccountCommercialSettings;
  onVerticalChange: (vertical: VerticalId) => void;
  onDemoModeChange: (demoMode: boolean) => void;
  saveState?: "idle" | "saving" | "saved" | "local_only" | "error";
};

export function CommercialControlBar({
  settings,
  onVerticalChange,
  onDemoModeChange,
  saveState = "idle",
}: Props) {
  const saveLabel =
    saveState === "saving"
      ? "Guardando..."
      : saveState === "saved"
        ? "Guardado en Supabase"
        : saveState === "local_only"
          ? "Solo local"
          : saveState === "error"
            ? "Error guardando"
            : "Configuracion activa";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_20px_70px_rgba(2,6,23,0.45)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Contexto comercial</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-100">{VERTICAL_CONFIGS[settings.vertical].label}</h2>
          <p className="mt-1 text-sm text-slate-400">{VERTICAL_CONFIGS[settings.vertical].heroDescription}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="space-y-1">
            <span className="block text-xs uppercase tracking-[0.12em] text-slate-500">Vertical</span>
            <select
              value={settings.vertical}
              onChange={(event) => onVerticalChange(event.target.value as VerticalId)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              {Object.values(VERTICAL_CONFIGS).map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => onDemoModeChange(!settings.demoMode)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
              settings.demoMode
                ? "border-amber-500/60 bg-amber-500/15 text-amber-100"
                : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500",
            )}
          >
            <MonitorPlay className="h-4 w-4" />
            Demo Mode {settings.demoMode ? "ON" : "OFF"}
          </button>

          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
            <Network className="h-4 w-4" />
            {saveLabel}
          </div>
        </div>
      </div>
    </section>
  );
}
