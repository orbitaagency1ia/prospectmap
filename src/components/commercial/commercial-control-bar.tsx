"use client";

import { Network } from "lucide-react";

import { VERTICAL_CONFIGS } from "@/lib/prospect-intelligence";
import type { AccountCommercialSettings, VerticalId } from "@/lib/prospect-intelligence";

type Props = {
  settings: AccountCommercialSettings;
  onVerticalChange: (vertical: VerticalId) => void;
  saveState?: "idle" | "saving" | "saved" | "local_only" | "error";
};

export function CommercialControlBar({
  settings,
  onVerticalChange,
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
    <section className="rounded-[28px] border border-[rgba(30,51,80,0.9)] bg-[rgba(13,23,40,0.88)] p-4 shadow-[0_20px_70px_rgba(3,9,18,0.36)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[rgba(58,190,249,0.82)]">Contexto comercial</p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--pm-text)]">{VERTICAL_CONFIGS[settings.vertical].label}</h2>
          <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{VERTICAL_CONFIGS[settings.vertical].heroDescription}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="space-y-1">
            <span className="block text-xs uppercase tracking-[0.12em] text-[var(--pm-text-tertiary)]">Vertical</span>
            <select
              value={settings.vertical}
              onChange={(event) => onVerticalChange(event.target.value as VerticalId)}
              className="rounded-2xl border border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.78)] px-3 py-2 text-sm text-[var(--pm-text)]"
            >
              {Object.values(VERTICAL_CONFIGS).map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.label}
                </option>
              ))}
            </select>
          </label>

          <div className="inline-flex items-center gap-2 rounded-2xl border border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.78)] px-3 py-2 text-xs text-[var(--pm-text-secondary)]">
            <Network className="h-4 w-4" />
            {saveLabel}
          </div>
        </div>
      </div>
    </section>
  );
}
