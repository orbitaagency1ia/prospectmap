"use client";

import { Network } from "lucide-react";

import { VERTICAL_CONFIGS } from "@/lib/prospect-intelligence";
import type { AccountCommercialSettings, VerticalId } from "@/lib/prospect-intelligence";

import { PmBadge, PmPanel } from "../ui/pm";

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
    <PmPanel className="p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="pm-kicker">Contexto comercial</p>
          <h2 className="pm-title mt-2 text-xl">{VERTICAL_CONFIGS[settings.vertical].label}</h2>
          <p className="pm-muted mt-1 text-sm">{VERTICAL_CONFIGS[settings.vertical].heroDescription}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="space-y-1">
            <span className="pm-caption block uppercase tracking-[0.12em]">Vertical</span>
            <select
              value={settings.vertical}
              onChange={(event) => onVerticalChange(event.target.value as VerticalId)}
              className="field min-w-[220px]"
            >
              {Object.values(VERTICAL_CONFIGS).map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.label}
                </option>
              ))}
            </select>
          </label>

          <PmBadge tone={saveState === "error" ? "rose" : saveState === "local_only" ? "amber" : "cyan"} className="min-h-[48px] px-3 py-2">
            <Network className="h-4 w-4" />
            {saveLabel}
          </PmBadge>
        </div>
      </div>
    </PmPanel>
  );
}
