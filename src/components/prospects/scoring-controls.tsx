"use client";

import { RotateCcw } from "lucide-react";

import {
  DEFAULT_SCORING_CONFIG,
  SCORING_RULES_META,
  type ScoringConfig,
} from "@/lib/prospect-intelligence";

type Props = {
  config: ScoringConfig;
  onChange: (config: ScoringConfig) => void;
  onReset: () => void;
};

export function ScoringControls({ config, onChange, onReset }: Props) {
  return (
    <section className="pm-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--pm-text)]">Reglas del score</h2>
          <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">
            Lógica visible y editable para ajustar encaje, potencial, urgencia y valor sin tocar la mecánica del pipeline.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="pm-btn pm-btn-secondary"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {SCORING_RULES_META.map((rule) => (
          <div key={rule.key} className="pm-card-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--pm-text)]">{rule.label}</p>
                <p className="text-xs text-[var(--pm-text-tertiary)]">{rule.description}</p>
              </div>
              <span className="rounded-md border border-[rgba(242,138,46,0.5)] bg-[rgba(242,138,46,0.12)] px-2 py-1 font-mono text-xs text-[rgba(255,214,179,0.98)]">
                {config[rule.key]}
              </span>
            </div>
            <input
              type="range"
              min={rule.min}
              max={rule.max}
              step={rule.step}
              value={config[rule.key]}
              onChange={(event) =>
                onChange({
                  ...config,
                  [rule.key]: Number(event.target.value),
                })
              }
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-[rgba(255,255,255,0.08)] accent-[var(--pm-primary)]"
            />
          </div>
        ))}
      </div>

      <div className="pm-card-soft mt-4 text-xs text-[var(--pm-text-tertiary)]">
        Base de referencia: {BASE_SUMMARY(DEFAULT_SCORING_CONFIG)}. Ajusta pesos, no estados ni datos del negocio.
      </div>
    </section>
  );
}

function BASE_SUMMARY(config: ScoringConfig) {
  return Object.values(config).reduce((sum, current) => sum + current, 0);
}
