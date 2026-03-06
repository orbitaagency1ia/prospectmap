"use client";

import { ScoringControls } from "@/components/prospects/scoring-controls";
import type { AccountCommercialSettings, CommercialPreferences, ScoringConfig, VerticalId } from "@/lib/prospect-intelligence";
import { getVerticalConfig } from "@/lib/commercial/verticals";

import { CommercialControlBar } from "./commercial-control-bar";

type Props = {
  settings: AccountCommercialSettings;
  saveState: "idle" | "saving" | "saved" | "local_only" | "error";
  tableAvailable: boolean;
  onVerticalChange: (vertical: VerticalId) => void;
  onDemoModeChange: (demoMode: boolean) => void;
  onScoringChange: (config: ScoringConfig) => void;
  onPreferencesChange: (preferences: CommercialPreferences) => void;
  onReset: () => void;
};

export function CommercialSettingsPanel({
  settings,
  saveState,
  tableAvailable,
  onVerticalChange,
  onDemoModeChange,
  onScoringChange,
  onPreferencesChange,
  onReset,
}: Props) {
  const vertical = getVerticalConfig(settings.vertical);

  return (
    <div className="space-y-4">
      <CommercialControlBar
        settings={settings}
        onVerticalChange={onVerticalChange}
        onDemoModeChange={onDemoModeChange}
        saveState={saveState}
      />

      <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
        <h2 className="text-base font-semibold text-slate-100">Preferencias comerciales</h2>
        <p className="mt-1 text-sm text-slate-400">{vertical.focusHeadline}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="block text-xs uppercase tracking-[0.12em] text-slate-500">Canal preferente</span>
            <select
              value={settings.commercialPreferences.preferredOutreach}
              onChange={(event) =>
                onPreferencesChange({
                  ...settings.commercialPreferences,
                  preferredOutreach: event.target.value as CommercialPreferences["preferredOutreach"],
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              <option value="mixto">Mixto</option>
              <option value="llamada_primero">Llamada primero</option>
              <option value="email_primero">Email primero</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-xs uppercase tracking-[0.12em] text-slate-500">Narrativa principal</span>
            <select
              value={settings.commercialPreferences.salesNarrative}
              onChange={(event) =>
                onPreferencesChange({
                  ...settings.commercialPreferences,
                  salesNarrative: event.target.value as CommercialPreferences["salesNarrative"],
                })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
            >
              <option value="captacion">Captacion</option>
              <option value="operacion">Operacion</option>
              <option value="roi">ROI</option>
            </select>
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
          <p className="font-medium text-slate-200">Vertical activa: {vertical.label}</p>
          <p className="mt-1">{vertical.description}</p>
          <p className="mt-2 text-xs text-slate-500">
            {tableAvailable
              ? "La configuracion se persiste por cuenta en Supabase y mantiene fallback local."
              : "La tabla account_settings no existe todavia. La configuracion funciona en local, pero debes ejecutar la migracion 0002 para persistirla en Supabase."}
          </p>
        </div>
      </section>

      <ScoringControls config={settings.scoringConfig} onChange={onScoringChange} onReset={onReset} />
    </div>
  );
}
