"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Clock3, Euro, Radar, TrendingUp } from "lucide-react";

import { mergeBusinesses } from "@/lib/business-helpers";
import {
  buildPipelineOverview,
  buildProspectRecords,
  isAccountCommercialProfileComplete,
  type PipelineSnapshot,
  type ProspectRecord,
} from "@/lib/prospect-intelligence";
import type { ProfileRow } from "@/lib/types";
import { cn, formatCurrency, formatDaysSince } from "@/lib/utils";

import { CommercialControlBar } from "../commercial/commercial-control-bar";
import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";

import { ProspectDetailPanel } from "./prospect-detail-panel";
import { ProspectListsPanel } from "./prospect-lists-panel";
import { OpportunityBadge, UrgencyBadge } from "./prospect-ui";
import { useSavedProspects } from "./use-saved-prospects";

type Props = {
  profile: ProfileRow;
};

export function PipelineClient({ profile }: Props) {
  const { businesses, latestNotes, loading, error } = useSavedProspects();
  const { settings, ready, saveState, setVertical } = useCommercialConfig(profile.id);
  const { profile: accountProfile, ready: profileReady } = useAccountCommercialProfile(profile.id);
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

  const records = useMemo(
    () => buildProspectRecords(combinedBusinesses, settings, accountProfile, profile.city_name),
    [accountProfile, combinedBusinesses, profile.city_name, settings],
  );
  const snapshot = useMemo(() => buildPipelineOverview(records), [records]);
  const selected =
    snapshot.closingSoon.find((record) => record.business.key === selectedKey) ??
    records.find((record) => record.business.key === selectedKey) ??
    snapshot.closingSoon[0] ??
    records[0] ??
    null;
  const commercialProfileComplete = isAccountCommercialProfileComplete(accountProfile);

  if (loading || !ready || !profileReady) {
    return <PageState text="Montando pipeline de cierre..." />;
  }

  if (error) {
    return <PageState text={error} />;
  }

  return (
    <div className="space-y-5 px-4 py-4 lg:px-0">
      <CommercialControlBar settings={settings} onVerticalChange={setVertical} saveState={saveState} />

      {!commercialProfileComplete ? (
        <section className="rounded-3xl border border-[rgba(245,185,66,0.35)] bg-[rgba(245,185,66,0.08)] px-4 py-3 text-sm text-[rgba(245,233,190,0.98)]">
          Completa el perfil comercial de la cuenta para afinar valor económico, servicio recomendado y cierre.
        </section>
      ) : null}

      <section className="rounded-[32px] border border-[rgba(30,51,80,0.95)] bg-[radial-gradient(circle_at_top_left,rgba(58,190,249,0.14),transparent_36%),linear-gradient(180deg,rgba(13,23,40,0.98),rgba(7,17,31,0.98))] p-6 shadow-[0_24px_80px_rgba(3,9,18,0.42)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[rgba(58,190,249,0.84)]">Pipeline de cierre</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--pm-text)]">
              Qué está más cerca de convertirse en dinero.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--pm-text-secondary)]">
              Esta vista concentra oportunidades activas, valor estimado, días sin tocar y siguiente movimiento para
              empujar cierres sin perder timing.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Euro} label="Valor abierto" value={formatCurrency(snapshot.openValue)} />
            <MetricCard icon={TrendingUp} label="Valor ponderado" value={formatCurrency(snapshot.weightedOpenValue)} />
            <MetricCard icon={Clock3} label="Seguimientos vencidos" value={`${snapshot.followUpDueCount}`} />
            <MetricCard icon={Radar} label="Oportunidades enfriándose" value={`${snapshot.staleCount}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-4 2xl:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-4">
          <section className="grid gap-4 xl:grid-cols-3">
            <FocusPanel
              title="Cierre cercano"
              description="Reuniones, propuestas y negociaciones que merecen foco hoy."
              records={snapshot.closingSoon}
              onSelect={setSelectedKey}
            />
            <FocusPanel
              title="Caducando"
              description="Leads con señal de enfriamiento o follow-up vencido."
              records={snapshot.neglected}
              onSelect={setSelectedKey}
            />
            <FocusPanel
              title="Ganado"
              description="Pipeline ya convertido; útil para demostrar tracción y expansión."
              records={snapshot.stages.find((stage) => stage.status === "ganado")?.records ?? []}
              onSelect={setSelectedKey}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            {snapshot.stages.map((stage) => (
              <PipelineStageColumn
                key={stage.status}
                stage={stage}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
              />
            ))}
          </section>

          <ProspectListsPanel
            userId={profile.id}
            records={records}
            title="Campañas de ataque y cierre"
            description="Guarda listas accionables y reutiliza foco comercial por ciudad, vertical o servicio."
            defaultName="Nueva campaña de cierre"
          />
        </div>

        <div className="space-y-4">
          <ProspectDetailPanel
            record={selected}
            showDemoBadges
            emptyText="Selecciona una oportunidad del pipeline para abrir el informe de cierre."
          />
          <PipelineSummary snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}

function FocusPanel({
  title,
  description,
  records,
  onSelect,
}: {
  title: string;
  description: string;
  records: ProspectRecord[];
  onSelect: (key: string) => void;
}) {
  return (
    <section className="rounded-[26px] border border-[rgba(30,51,80,0.9)] bg-[rgba(13,23,40,0.9)] p-4 shadow-[0_18px_48px_rgba(3,9,18,0.24)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--pm-text)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">{description}</p>

      <div className="mt-4 space-y-3">
        {records.length === 0 ? (
          <p className="rounded-2xl border border-[rgba(30,51,80,0.9)] bg-[rgba(7,17,31,0.72)] px-3 py-3 text-sm text-[var(--pm-text-secondary)]">
            Sin oportunidades en este bloque.
          </p>
        ) : null}

        {records.slice(0, 4).map((record) => (
          <button
            key={record.business.key}
            type="button"
            onClick={() => onSelect(record.business.key)}
            className="w-full rounded-2xl border border-[rgba(30,51,80,0.9)] bg-[rgba(18,32,51,0.74)] p-3 text-left transition hover:border-[rgba(58,190,249,0.45)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--pm-text)]">{record.business.name}</p>
                <p className="mt-1 text-xs text-[var(--pm-text-secondary)]">{record.insight.service.shortLabel}</p>
              </div>
              <p className="text-sm font-semibold text-[rgba(58,190,249,0.96)]">{formatCurrency(record.insight.weightedValue)}</p>
            </div>
            <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">{record.insight.nextAction.action}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function PipelineStageColumn({
  stage,
  selectedKey,
  onSelect,
}: {
  stage: PipelineSnapshot["stages"][number];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <section className="rounded-[26px] border border-[rgba(30,51,80,0.9)] bg-[rgba(13,23,40,0.9)] p-4 shadow-[0_18px_48px_rgba(3,9,18,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--pm-text)]">{stage.label}</h3>
          <p className="mt-1 text-xs text-[var(--pm-text-tertiary)]">
            {stage.count} leads · score medio {stage.averageScore || "0"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--pm-text-tertiary)]">Valor</p>
          <p className="mt-1 text-sm font-semibold text-[var(--pm-text)]">{formatCurrency(stage.weightedValue)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {stage.records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(30,51,80,0.95)] bg-[rgba(7,17,31,0.72)] px-3 py-4 text-sm text-[var(--pm-text-secondary)]">
            Sin oportunidades aquí.
          </div>
        ) : null}

        {stage.records.map((record) => (
          <button
            key={record.business.key}
            type="button"
            onClick={() => onSelect(record.business.key)}
            className={cn(
              "w-full rounded-2xl border p-3 text-left transition",
              selectedKey === record.business.key
                ? "border-[rgba(58,190,249,0.5)] bg-[rgba(18,32,51,0.95)]"
                : "border-[rgba(30,51,80,0.9)] bg-[rgba(18,32,51,0.74)] hover:border-[rgba(58,190,249,0.4)]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--pm-text)]">{record.business.name}</p>
                <p className="mt-1 text-xs text-[var(--pm-text-secondary)]">{record.insight.service.shortLabel}</p>
              </div>
              <p className="text-sm font-semibold text-[rgba(58,190,249,0.96)]">{record.insight.score}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <OpportunityBadge record={record} />
              <UrgencyBadge urgency={record.insight.nextAction.urgency} />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MiniMetric label="Qué hacer ahora" value={record.insight.nextAction.action} />
              <MiniMetric label="Días sin tocar" value={formatDaysSince(record.insight.daysSinceTouch)} />
              <MiniMetric label="Valor" value={formatCurrency(record.insight.estimatedValue)} />
              <MiniMetric label="Ponderado" value={formatCurrency(record.insight.weightedValue)} />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PipelineSummary({ snapshot }: { snapshot: PipelineSnapshot }) {
  return (
    <section className="rounded-[28px] border border-[rgba(30,51,80,0.9)] bg-[rgba(13,23,40,0.9)] p-5 shadow-[0_20px_54px_rgba(3,9,18,0.3)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[rgba(58,190,249,0.8)]">Resumen ejecutivo</p>
      <div className="mt-4 space-y-3">
        <SummaryRow
          label="Valor bruto del pipeline"
          value={formatCurrency(snapshot.openValue)}
          detail="Suma estimada de oportunidades abiertas."
        />
        <SummaryRow
          label="Valor ponderado"
          value={formatCurrency(snapshot.weightedOpenValue)}
          detail="Valor ajustado por probabilidad de cierre."
        />
        <SummaryRow
          label="Seguimientos vencidos"
          value={`${snapshot.followUpDueCount}`}
          detail="Toques que ya deberían haberse hecho."
        />
        <SummaryRow
          label="Leads enfriándose"
          value={`${snapshot.staleCount}`}
          detail="Cuentas activas que están perdiendo timing."
        />
      </div>
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[rgba(30,51,80,0.92)] bg-[rgba(18,32,51,0.88)] px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-[rgba(58,190,249,0.28)] bg-[rgba(58,190,249,0.1)] p-2 text-[rgba(58,190,249,0.96)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--pm-text-tertiary)]">{label}</p>
          <p className="mt-1 text-lg font-semibold text-[var(--pm-text)]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[rgba(30,51,80,0.82)] bg-[rgba(7,17,31,0.64)] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pm-text-tertiary)]">{label}</p>
      <p className="mt-1 text-sm text-[var(--pm-text)]">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(30,51,80,0.9)] bg-[rgba(7,17,31,0.7)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--pm-text)]">{label}</p>
          <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{detail}</p>
        </div>
        <p className="text-base font-semibold text-[rgba(58,190,249,0.96)]">{value}</p>
      </div>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <section className="rounded-[28px] border border-[rgba(30,51,80,0.9)] bg-[rgba(13,23,40,0.92)] px-5 py-6 text-sm text-[var(--pm-text-secondary)]">
      {text}
    </section>
  );
}
