"use client";

import { useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";

import { PRIORITY_OPTIONS, PROSPECT_STATUS_ORDER, STATUS_META, type PriorityLevel, type ProspectStatus } from "@/lib/constants";
import { mergeBusinesses } from "@/lib/business-helpers";
import {
  buildCityOptions,
  buildProspectRecords,
  buildSectorOptions,
  normalizeRankingFilters,
  sortProspectRecordsByScore,
} from "@/lib/prospect-intelligence";
import type { ProfileRow } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

import { ProspectDetailPanel } from "./prospect-detail-panel";
import { OpportunityBadge, UrgencyBadge } from "./prospect-ui";
import { ScoringControls } from "./scoring-controls";
import { useSavedProspects } from "./use-saved-prospects";
import { useScoringConfig } from "./use-scoring-config";

type Props = {
  profile: ProfileRow;
};

type RankingFilters = {
  city: string;
  sector: string;
  status: ProspectStatus | "all";
  priority: PriorityLevel | "all";
};

export function RankingClient({ profile }: Props) {
  const { businesses, latestNotes, loading, error } = useSavedProspects();
  const { config, setConfig, reset, ready } = useScoringConfig();

  const [filters, setFilters] = useState<RankingFilters>(normalizeRankingFilters());
  const [descending, setDescending] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const combinedBusinesses = mergeBusinesses({
    savedBusinesses: businesses,
    overpassBusinesses: [],
    latestNotes,
  });

  const allRecords = sortProspectRecordsByScore(buildProspectRecords(combinedBusinesses, config, profile.city_name));
  const cityOptions = buildCityOptions(allRecords);
  const sectorOptions = buildSectorOptions(allRecords);

  const filteredRecords = allRecords.filter((record) => {
    if (filters.city !== "all" && record.insight.cityLabel !== filters.city) {
      return false;
    }

    if (filters.sector !== "all" && record.insight.sectorLabel !== filters.sector) {
      return false;
    }

    if (filters.status !== "all" && record.business.status !== filters.status) {
      return false;
    }

    if (filters.priority !== "all" && record.business.priority !== filters.priority) {
      return false;
    }

    return true;
  });

  const sortedRecords = descending ? filteredRecords : [...filteredRecords].reverse();
  const selected = sortedRecords.find((record) => record.business.key === selectedKey) ?? sortedRecords[0] ?? null;

  if (loading || !ready) {
    return <PageState text="Calculando ranking de prospectos..." />;
  }

  if (error) {
    return <PageState text={error} />;
  }

  return (
    <div className="grid gap-4 px-4 py-4 2xl:grid-cols-[1.5fr_0.9fr] lg:px-0">
      <div className="space-y-4">
        <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Ranking</p>
              <h1 className="mt-2 text-2xl font-semibold text-slate-100">Prospectos ordenados por score</h1>
              <p className="mt-1 text-sm text-slate-400">
                Lista operativa para decidir a quien atacar primero y con que oferta entrar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDescending((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            >
              {descending ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpWideNarrow className="h-4 w-4" />}
              Score {descending ? "desc" : "asc"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <FilterSelect
              label="Ciudad"
              value={filters.city}
              onChange={(value) => setFilters({ ...filters, city: value })}
              options={cityOptions}
            />
            <FilterSelect
              label="Sector"
              value={filters.sector}
              onChange={(value) => setFilters({ ...filters, sector: value })}
              options={sectorOptions}
            />
            <FilterSelect
              label="Estado"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value as ProspectStatus | "all" })}
              options={PROSPECT_STATUS_ORDER.map((status) => STATUS_META[status].label)}
              values={["all", ...PROSPECT_STATUS_ORDER]}
            />
            <FilterSelect
              label="Prioridad"
              value={filters.priority}
              onChange={(value) => setFilters({ ...filters, priority: value as PriorityLevel | "all" })}
              options={PRIORITY_OPTIONS.map((priority) => priority.charAt(0).toUpperCase() + priority.slice(1))}
              values={["all", ...PRIORITY_OPTIONS]}
            />
            <button
              type="button"
              onClick={() => setFilters(normalizeRankingFilters())}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/65">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-800 bg-slate-950/70 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Sector</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Siguiente accion</th>
                  <th className="px-4 py-3">Ultima interaccion</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-sm text-slate-400">
                      No hay prospectos que cumplan esos filtros.
                    </td>
                  </tr>
                ) : null}
                {sortedRecords.map((record) => (
                  <tr
                    key={record.business.key}
                    onClick={() => setSelectedKey(record.business.key)}
                    className={cn(
                      "cursor-pointer border-b border-slate-800/80 text-sm transition hover:bg-slate-950/60",
                      selected?.business.key === record.business.key ? "bg-slate-950/70" : "",
                    )}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-100">{record.business.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{record.insight.cityLabel}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">{record.insight.sectorLabel}</td>
                    <td className="px-4 py-3 align-top">
                      <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", STATUS_META[record.business.status].badgeClass)}>
                        {STATUS_META[record.business.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-2">
                        <p className="text-lg font-semibold text-cyan-100">{record.insight.score}</p>
                        <OpportunityBadge record={record} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-slate-100">{record.insight.nextAction.action}</p>
                      <div className="mt-2">
                        <UrgencyBadge urgency={record.insight.nextAction.urgency} />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-slate-400">{formatDateTime(record.business.lastInteractionAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <ProspectDetailPanel record={selected} emptyText="Selecciona una fila del ranking para ver el guion comercial." />
        <ScoringControls config={config} onChange={setConfig} onReset={reset} />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  values,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  values?: string[];
}) {
  const optionValues = values ?? ["all", ...options];
  const optionLabels = values ? ["Todos", ...options] : ["Todos", ...options];

  return (
    <label className="space-y-1">
      <span className="block text-xs uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
      >
        {optionValues.map((optionValue, index) => (
          <option key={`${label}-${optionValue}`} value={optionValue}>
            {optionLabels[index] ?? optionValue}
          </option>
        ))}
      </select>
    </label>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="px-4 py-4 lg:px-0">
      <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-400">{text}</section>
    </div>
  );
}
