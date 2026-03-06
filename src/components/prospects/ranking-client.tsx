"use client";

import { useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from "lucide-react";

import {
  PRIORITY_OPTIONS,
  PROSPECT_STATUS_ORDER,
  STATUS_META,
  type PriorityLevel,
  type ProspectStatus,
} from "@/lib/constants";
import { mergeBusinesses } from "@/lib/business-helpers";
import {
  buildCityOptions,
  buildCommandCenterSummary,
  buildProspectRecords,
  buildSectorOptions,
  isAccountCommercialProfileComplete,
  normalizeRankingFilters,
  sortProspectRecordsByScore,
} from "@/lib/prospect-intelligence";
import type { ProfileRow } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

import { CommercialControlBar } from "../commercial/commercial-control-bar";
import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";

import { ProspectDetailPanel } from "./prospect-detail-panel";
import { OpportunityBadge, UrgencyBadge } from "./prospect-ui";
import { useSavedProspects } from "./use-saved-prospects";

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
  const { settings, ready, saveState, setDemoMode, setVertical } = useCommercialConfig(profile.id);
  const { profile: accountProfile, ready: profileReady } = useAccountCommercialProfile(profile.id);

  const [filters, setFilters] = useState<RankingFilters>(normalizeRankingFilters());
  const [descending, setDescending] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const combinedBusinesses = useMemo(
    () =>
      mergeBusinesses({
        savedBusinesses: businesses,
        overpassBusinesses: [],
        latestNotes,
      }),
    [businesses, latestNotes],
  );

  const allRecords = useMemo(
    () => sortProspectRecordsByScore(buildProspectRecords(combinedBusinesses, settings, accountProfile, profile.city_name)),
    [accountProfile, combinedBusinesses, profile.city_name, settings],
  );
  const cityOptions = useMemo(() => buildCityOptions(allRecords), [allRecords]);
  const sectorOptions = useMemo(() => buildSectorOptions(allRecords), [allRecords]);

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
  const filteredSummary = useMemo(
    () => buildCommandCenterSummary(sortedRecords, settings.vertical),
    [settings.vertical, sortedRecords],
  );
  const commercialProfileComplete = isAccountCommercialProfileComplete(accountProfile);

  if (loading || !ready || !profileReady) {
    return <PageState text="Calculando ranking de prospectos..." />;
  }

  if (error) {
    return <PageState text={error} />;
  }

  return (
    <div className="space-y-4 px-4 py-4 lg:px-0">
      <CommercialControlBar
        settings={settings}
        onVerticalChange={setVertical}
        onDemoModeChange={setDemoMode}
        saveState={saveState}
      />

      {!commercialProfileComplete ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          El perfil comercial de la cuenta sigue incompleto. El ranking actual usa la base vertical, pero puede afinar
          mucho mas cuando completes ICP, oferta y ticket en `Cuenta`.
        </section>
      ) : null}

      <div className="grid gap-4 2xl:grid-cols-[1.55fr_0.92fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Ranking</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-100">Prospectos ordenados por score</h1>
                <p className="mt-1 text-sm text-slate-400">
                  Lista operativa para decidir a quién atacar primero y con qué propuesta entrar.
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

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setFilters(normalizeRankingFilters())}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <TopMetric label="Filtrados" value={sortedRecords.length} />
              <TopMetric label="Alta oportunidad" value={sortedRecords.filter((record) => record.insight.score >= 75).length} />
              <TopMetric label="Seguimiento urgente" value={sortedRecords.filter((record) => record.insight.nextAction.urgency === "alta").length} />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Siguiente acción</th>
                    <th className="px-4 py-3">Última interacción</th>
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
                        <p className="mt-1 text-xs text-slate-500">
                          {record.insight.cityLabel} · {record.insight.effectiveVerticalLabel}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-300">{record.insight.sectorLabel}</td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            STATUS_META[record.business.status].badgeClass,
                          )}
                        >
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
                        <p className="mt-1 text-xs text-slate-500">{record.insight.service.shortLabel}</p>
                        <div className="mt-2">
                          <UrgencyBadge urgency={record.insight.nextAction.urgency} />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-400">
                        {formatDateTime(record.business.lastInteractionAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <ProspectDetailPanel
            record={selected}
            showDemoBadges={settings.demoMode}
            emptyText="Selecciona una fila del ranking para ver el guion comercial."
          />
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Lectura del ranking</p>
            <div className="mt-3 space-y-3">
              <SidebarStat label="Servicios dominantes" value={filteredSummary.serviceDistribution[0]?.label ?? "Sin señal"} />
              <SidebarStat label="Vertical dominante" value={filteredSummary.marketVerticalDistribution[0]?.label ?? "Sin señal"} />
              <SidebarStat label="Sector dominante" value={filteredSummary.sectorDistribution[0]?.label ?? "Sin señal"} />
            </div>
          </aside>
        </div>
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
  const optionLabels = ["Todos", ...options];

  return (
    <label className="space-y-1">
      <span className="block text-xs uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
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

function TopMetric({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
    </article>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="px-4 py-4 lg:px-0">
      <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-400">{text}</section>
    </div>
  );
}
