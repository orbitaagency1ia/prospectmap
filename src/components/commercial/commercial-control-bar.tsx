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
      ? "Guardando"
      : saveState === "saved"
        ? "Cambios guardados"
        : saveState === "local_only"
          ? "Solo en este equipo"
          : saveState === "error"
            ? "Revisar sincronización"
            : "Todo al día";

  return (
    <PmPanel className="px-4 py-4 md:px-5 md:py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pm-kicker">Contexto comercial</span>
            <PmBadge tone={saveState === "error" ? "rose" : saveState === "local_only" ? "amber" : "neutral"}>
              <Network className="h-3.5 w-3.5" />
              {saveLabel}
            </PmBadge>
          </div>
          <h2 className="pm-title mt-3 text-[1.15rem] sm:text-[1.35rem]">{VERTICAL_CONFIGS[settings.vertical].label}</h2>
          <p className="pm-muted mt-2 text-sm leading-6">{VERTICAL_CONFIGS[settings.vertical].heroDescription}</p>
        </div>

        <label className="block min-w-[220px] lg:min-w-[250px]">
          <span className="pm-caption mb-2 block uppercase tracking-[0.16em]">Vertical</span>
          <select
            value={settings.vertical}
            onChange={(event) => onVerticalChange(event.target.value as VerticalId)}
            className="field"
          >
            {Object.values(VERTICAL_CONFIGS).map((vertical) => (
              <option key={vertical.id} value={vertical.id}>
                {vertical.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </PmPanel>
  );
}
