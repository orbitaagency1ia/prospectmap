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
  type ProspectRecord,
} from "@/lib/prospect-intelligence";
import type { ProfileRow } from "@/lib/types";
import { cn, formatCurrency, formatDaysSince } from "@/lib/utils";

import { CommercialControlBar } from "../commercial/commercial-control-bar";
import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { PmBadge, PmEmpty, PmHero, PmNotice, PmPanel, PmSectionHeader } from "../ui/pm";

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

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.28fr)_430px]">
        <div className="space-y-5">
          <PmHero
            eyebrow="Prioridades"
            title="Prioriza sin dudas."
            description="Las cuentas con mejor encaje, mejor momento y más valor."
            actions={
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="pm-caption">Lectura rápida</p>
                  <p className="text-sm leading-6 text-[var(--pm-text)]">
                    {filteredSummary.serviceDistribution[0]?.label ?? "Sin servicio dominante"}
                  </p>
                  <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">
                    {filteredSummary.sectorDistribution[0]?.label ?? "Sin sector dominante"} · {filteredSummary.marketVerticalDistribution[0]?.label ?? "Sin vertical dominante"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/attack?source=priorities" className="pm-btn pm-btn-primary">
                    Empezar ataque
                  </Link>
                  <button type="button" onClick={() => setDescending((value) => !value)} className="pm-btn pm-btn-secondary">
                    {descending ? <ArrowDownWideNarrow className="h-4 w-4" /> : <ArrowUpWideNarrow className="h-4 w-4" />}
                    {descending ? "Mayor prioridad" : "Menor prioridad"}
                  </button>
                </div>
              </div>
            }
          >
            <div className="pm-hero-metrics">
              <CompactMetric label="En foco" value={sortedRecords.length} helper="Prospectos filtrados" />
              <CompactMetric
                label="Alta oportunidad"
                value={sortedRecords.filter((record) => record.insight.score >= 75).length}
                helper="Listos para trabajar"
              />
              <CompactMetric label="Valor visible" value={formatCurrency(filteredSummary.estimatedValueTotal)} helper="Potencial estimado" />
            </div>
          </PmHero>

          <PmPanel className="p-4 sm:p-5">
            <PmSectionHeader
              eyebrow="Refinar"
              title="Qué quieres ver ahora"
              description="Recorta la cola sin perder contexto comercial."
            />

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_164px]">
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
          </PmPanel>

          <PmPanel className="overflow-hidden p-0">
            <div className="pm-stage-divider flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-5">
              <div>
                <p className="pm-kicker">Lista priorizada</p>
                <p className="pm-muted mt-2 text-sm">Orden natural por encaje, valor y momento.</p>
              </div>
              <PmBadge>{sortedRecords.length} visibles</PmBadge>
            </div>

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

            <div className="hidden lg:block">
              <div className="grid grid-cols-[minmax(0,1.75fr)_0.9fr_0.9fr_1.05fr_0.7fr] gap-3 border-b border-[var(--pm-border)] px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-[var(--pm-text-tertiary)]">
                <span>Cuenta</span>
                <span>Señal</span>
                <span>Valor</span>
                <span>Acción</span>
                <span>Timing</span>
              </div>
              <div className="space-y-2 p-3">
                {sortedRecords.length === 0 ? <PmEmpty body="No hay prospectos que cumplan esos filtros." /> : null}
                {sortedRecords.map((record) => (
                  <RankingRow
                    key={record.business.key}
                    record={record}
                    active={selected?.business.key === record.business.key}
                    onSelect={() => setSelectedKey(record.business.key)}
                  />
                ))}
              </div>
            </div>
          </PmPanel>

          <ProspectListsPanel
            userId={profile.id}
            records={sortedRecords}
            title="Listas"
            description="Guarda el corte actual y síguelo como una campaña."
            defaultName="Nueva lista priorizada"
          />
        </div>

        <div className="space-y-4 2xl:sticky 2xl:top-[7.75rem] 2xl:self-start">
          <ProspectDetailPanel
            record={selected}
            showDemoBadges
            emptyText="Selecciona una cuenta para ver el informe."
          />
          <PmPanel className="p-5">
            <p className="pm-kicker">Radar</p>
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

function CompactMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <div className="pm-focus-pane px-4 py-4">
      <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
      <p className="pm-title mt-3 text-[1.6rem] leading-none">{value}</p>
      <p className="pm-muted mt-2 text-sm">{helper}</p>
    </div>
  );
}

function RankingRow({
  record,
  active,
  onSelect,
}: {
  record: ProspectRecord;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "pm-list-row w-full rounded-[1.4rem] px-4 py-4 text-left",
        active
          ? "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] shadow-[0_18px_38px_rgba(0,0,0,0.15)]"
          : "",
      )}
    >
      <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.75fr)_0.9fr_0.9fr_1.05fr_0.7fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex rounded-full px-2 py-1 text-[11px] font-medium", STATUS_META[record.business.status].badgeClass)}>
              {STATUS_META[record.business.status].label}
            </span>
            <OpportunityBadge record={record} />
          </div>
          <p className="pm-title mt-3 text-[1rem] leading-tight">{record.business.name}</p>
          <p className="pm-muted mt-2 text-sm">
            {record.insight.sectorLabel} · {record.insight.cityLabel} · {record.insight.effectiveVerticalLabel}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-text-secondary)]">{record.insight.attackSummary}</p>
        </div>

        <div className="space-y-2">
          <p className="pm-caption uppercase tracking-[0.16em]">Señal</p>
          <p className="text-sm font-medium text-[var(--pm-text)]">{record.insight.service.shortLabel}</p>
          <UrgencyBadge urgency={record.insight.nextAction.urgency} />
        </div>

        <div className="space-y-2">
          <p className="pm-caption uppercase tracking-[0.16em]">Valor</p>
          <p className="text-sm font-medium text-[var(--pm-text)]">{formatCurrency(record.insight.estimatedValue)}</p>
          <p className="text-xs text-[var(--pm-text-tertiary)]">{formatCurrency(record.insight.weightedValue)} ponderado</p>
        </div>

        <div className="space-y-2">
          <p className="pm-caption uppercase tracking-[0.16em]">Qué hacer</p>
          <p className="text-sm font-medium text-[var(--pm-text)]">{record.insight.nextAction.action}</p>
          <p className="text-xs leading-5 text-[var(--pm-text-tertiary)]">{record.insight.nextAction.channel}</p>
        </div>

        <div className="space-y-2 text-right xl:text-left">
          <p className="pm-caption uppercase tracking-[0.16em]">Prioridad</p>
          <p className="pm-title text-[1.45rem] leading-none">{record.insight.score}</p>
          <p className="text-xs text-[var(--pm-text-tertiary)]">
            {formatDaysSince(record.insight.daysSinceTouch)} · {record.insight.attentionLabel}
          </p>
        </div>
      </div>
    </button>
  );
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
