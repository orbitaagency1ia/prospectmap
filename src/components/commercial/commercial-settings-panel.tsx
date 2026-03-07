"use client";

import { ScoringControls } from "@/components/prospects/scoring-controls";
import type { AccountCommercialSettings, CommercialPreferences, ScoringConfig, VerticalId } from "@/lib/prospect-intelligence";
import { getVerticalConfig } from "@/lib/commercial/verticals";

import { PmPanel } from "../ui/pm";

import { CommercialControlBar } from "./commercial-control-bar";

type Props = {
  settings: AccountCommercialSettings;
  saveState: "idle" | "saving" | "saved" | "local_only" | "error";
  tableAvailable: boolean;
  onVerticalChange: (vertical: VerticalId) => void;
  onScoringChange: (config: ScoringConfig) => void;
  onPreferencesChange: (preferences: CommercialPreferences) => void;
  onReset: () => void;
};

export function CommercialSettingsPanel({
  settings,
  saveState,
  tableAvailable,
  onVerticalChange,
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
        saveState={saveState}
      />

      <PmPanel className="p-4">
        <h2 className="text-base font-semibold text-[var(--pm-text)]">Preferencias comerciales</h2>
        <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{vertical.focusHeadline}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="pm-caption block uppercase tracking-[0.12em]">Canal preferente</span>
            <select
              value={settings.commercialPreferences.preferredOutreach}
              onChange={(event) =>
                onPreferencesChange({
                  ...settings.commercialPreferences,
                  preferredOutreach: event.target.value as CommercialPreferences["preferredOutreach"],
                })
              }
              className="field"
            >
              <option value="mixto">Mixto</option>
              <option value="llamada_primero">Llamada primero</option>
              <option value="email_primero">Email primero</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="pm-caption block uppercase tracking-[0.12em]">Narrativa principal</span>
            <select
              value={settings.commercialPreferences.salesNarrative}
              onChange={(event) =>
                onPreferencesChange({
                  ...settings.commercialPreferences,
                  salesNarrative: event.target.value as CommercialPreferences["salesNarrative"],
                })
              }
              className="field"
            >
              <option value="captacion">Captación</option>
              <option value="operacion">Operación</option>
              <option value="roi">ROI</option>
            </select>
          </label>
        </div>

        <div className="pm-card-soft mt-4 text-sm text-[var(--pm-text-secondary)]">
          <p className="font-medium text-[var(--pm-text)]">Vertical activa: {vertical.label}</p>
          <p className="mt-1">{vertical.description}</p>
          <p className="mt-2 text-xs text-[var(--pm-text-tertiary)]">
            {tableAvailable
              ? "Los ajustes quedan vinculados a la cuenta y se mantienen consistentes entre sesiones."
              : "Esta instalación está guardando los ajustes de forma temporal en este dispositivo hasta completar la configuración de cuenta."}
          </p>
        </div>
      </PmPanel>

      <ScoringControls config={settings.scoringConfig} onChange={onScoringChange} onReset={onReset} />
    </div>
  );
}
