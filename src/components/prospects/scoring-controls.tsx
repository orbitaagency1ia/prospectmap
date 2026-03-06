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
    <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">Reglas del score</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lógica visible y editable. Se persiste por cuenta cuando `account_settings` está disponible y mantiene fallback local.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {SCORING_RULES_META.map((rule) => (
          <div key={rule.key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-100">{rule.label}</p>
                <p className="text-xs text-slate-500">{rule.description}</p>
              </div>
              <span className="rounded-md border border-cyan-700/60 bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-200">
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
              className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
        Base de referencia: {BASE_SUMMARY(DEFAULT_SCORING_CONFIG)}. Ajusta pesos, no estados ni datos del negocio.
      </div>
    </section>
  );
}

function BASE_SUMMARY(config: ScoringConfig) {
  return Object.values(config).reduce((sum, current) => sum + current, 0);
}
