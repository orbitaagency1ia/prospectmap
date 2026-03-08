"use client";

import Link from "next/link";
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
import { cn, formatCurrency, formatDaysSince } from "@/lib/utils";

import { CommercialControlBar } from "../commercial/commercial-control-bar";
import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { PmEmpty, PmHero, PmMetric, PmNotice, PmPanel, PmSectionHeader } from "../ui/pm";

import { ProspectDetailPanel } from "./prospect-detail-panel";
import { ProspectListsPanel } from "./prospect-lists-panel";
import { ProspectCard } from "./prospect-ui";
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
  const { settings, ready, saveState, setVertical } = useCommercialConfig(profile.id);
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
    <div className="pm-page">
      <CommercialControlBar
        settings={settings}
        onVerticalChange={setVertical}
        saveState={saveState}
      />

      {!commercialProfileComplete ? (
        <PmNotice tone="amber">
          Completa el perfil comercial en `Configuración` para afinar este ranking.
        </PmNotice>
      ) : null}

      <div className="grid gap-4 2xl:grid-cols-[1.55fr_0.92fr]">
        <div className="space-y-4">
          <PmHero
            eyebrow="Prioridades"
            title="Prioridad comercial."
            description="Qué merece atención primero y por qué."
            actions={
              <div className="flex flex-wrap gap-2">
                <Link href="/attack?source=priorities" className="pm-btn pm-btn-primary">
                  Ir a Ataque
                </Link>
                <button type="button" onClick={() => setDescending((value) => !value)} className="pm-btn pm-btn-secondary">
                  {descending ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpWideNarrow className="h-4 w-4" />}
                  Prioridad {descending ? "desc" : "asc"}
                </button>
              </div>
            }
          />

          <PmPanel className="p-5 sm:p-6">
            <PmSectionHeader
              title="Filtros de trabajo"
              description="Recorta la lista por ciudad, sector, estado y prioridad sin perder el informe comercial."
              
            />

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
                <button type="button" onClick={() => setFilters(normalizeRankingFilters())} className="pm-btn pm-btn-secondary w-full">
                  Limpiar filtros
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <TopMetric label="Filtrados" value={sortedRecords.length} />
              <TopMetric label="Alta oportunidad" value={sortedRecords.filter((record) => record.insight.score >= 75).length} />
              <TopMetric label="Valor filtrado" value={formatCurrency(filteredSummary.estimatedValueTotal)} />
            </div>
          </PmPanel>

          <PmPanel className="overflow-hidden p-0">
            <div className="space-y-3 p-3 lg:hidden">
              {sortedRecords.length === 0 ? <PmEmpty body="No hay prospectos que cumplan esos filtros." /> : null}
              {sortedRecords.map((record) => (
                <div
                  key={record.business.key}
                    className={cn(
                      "rounded-[1.4rem] border transition",
                      selected?.business.key === record.business.key
                      ? "border-[rgba(255,255,255,0.08)] bg-[rgba(24,29,36,0.84)] shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
                      : "border-[var(--pm-border)] bg-[rgba(18,22,28,0.68)]",
                    )}
                  >
                  <ProspectCard
                    record={record}
                    onSelect={(next) => setSelectedKey(next.business.key)}
                    actionLabel="Ver informe"
                    showDemoBadges
                  />
                </div>
              ))}
            </div>

            <div className="pm-table-wrap hidden lg:block">
              <table className="min-w-full text-left">
                <thead className="border-b border-[var(--pm-border)] bg-[rgba(255,255,255,0.025)] text-xs uppercase tracking-[0.16em] text-[var(--pm-text-tertiary)]">
                  <tr>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Sector</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Prioridad comercial</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Qué hacer ahora</th>
                    <th className="px-4 py-3">Días sin tocar</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-sm text-[var(--pm-text-secondary)]">
                        No hay prospectos que cumplan esos filtros.
                      </td>
                    </tr>
                  ) : null}
                  {sortedRecords.map((record) => (
                    <tr
                      key={record.business.key}
                      onClick={() => setSelectedKey(record.business.key)}
                      className={cn(
                        "cursor-pointer border-b border-[var(--pm-border)] text-sm transition hover:bg-[rgba(255,255,255,0.02)]",
                        selected?.business.key === record.business.key ? "bg-[rgba(255,255,255,0.035)]" : "",
                      )}
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-[var(--pm-text)]">{record.business.name}</p>
                        <p className="mt-1 text-xs text-[var(--pm-text-tertiary)]">
                          {record.insight.cityLabel} · {record.insight.effectiveVerticalLabel}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top text-[var(--pm-text-secondary)]">{record.insight.sectorLabel}</td>
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
                          <p className="text-lg font-semibold text-[var(--pm-text)]">{record.insight.score}</p>
                          <OpportunityBadge record={record} />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-[var(--pm-text)]">{formatCurrency(record.insight.estimatedValue)}</p>
                        <p className="mt-1 text-xs text-[var(--pm-text-tertiary)]">{formatCurrency(record.insight.weightedValue)} ponderado</p>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-[var(--pm-text)]">{record.insight.nextAction.action}</p>
                        <p className="mt-1 text-xs text-[var(--pm-text-tertiary)]">{record.insight.service.shortLabel}</p>
                        <div className="mt-2">
                          <UrgencyBadge urgency={record.insight.nextAction.urgency} />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-[var(--pm-text-secondary)]">
                        <p>{formatDaysSince(record.insight.daysSinceTouch)}</p>
                        <p className="mt-1 text-xs text-[var(--pm-text-tertiary)]">{record.insight.attentionLabel}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PmPanel>
          <ProspectListsPanel
            userId={profile.id}
            records={sortedRecords}
            title="Listas de prioridades"
            description="Convierte el filtro actual en una lista guardada."
            defaultName="Nueva lista priorizada"
          />
        </div>

        <div className="space-y-4">
          <ProspectDetailPanel
            record={selected}
            showDemoBadges
            emptyText="Selecciona una cuenta para ver el informe."
          />
          <PmPanel className="p-5">
            <p className="pm-kicker">Lectura del ranking</p>
            <div className="mt-4 space-y-3">
              <SidebarStat label="Servicios dominantes" value={filteredSummary.serviceDistribution[0]?.label ?? "Sin señal"} />
              <SidebarStat label="Vertical dominante" value={filteredSummary.marketVerticalDistribution[0]?.label ?? "Sin señal"} />
              <SidebarStat label="Sector dominante" value={filteredSummary.sectorDistribution[0]?.label ?? "Sin señal"} />
            </div>
          </PmPanel>
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
    <label className="space-y-1.5">
      <span className="pm-caption block uppercase tracking-[0.16em]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field"
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

function TopMetric({ label, value }: { label: string; value: number | string }) {
  return <PmMetric label={label} value={value} />;
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--pm-text)]">{value}</p>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="pm-page">
      <section className="pm-panel text-sm text-[var(--pm-text-secondary)]">{text}</section>
    </div>
  );
}
