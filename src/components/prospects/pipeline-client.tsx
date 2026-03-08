"use client";

import Link from "next/link";
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
import { PmEmpty, PmHero, PmMetric, PmNotice, PmPanel } from "../ui/pm";

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
    <div className="pm-page">
      <CommercialControlBar settings={settings} onVerticalChange={setVertical} saveState={saveState} />

      {!commercialProfileComplete ? (
        <PmNotice tone="amber">
          Completa el perfil comercial para afinar valor, servicio y cierre.
        </PmNotice>
      ) : null}

      <PmHero
        eyebrow="Pipeline de cierre"
        title="Cierra con foco."
        description="Qué está cerca de avanzar y qué se está enfriando."
        actions={
          <div className="space-y-3">
            <Link href="/attack?source=pipeline" className="pm-btn pm-btn-primary w-full sm:w-auto">
              Atacar desde pipeline
            </Link>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Euro} label="Valor abierto" value={formatCurrency(snapshot.openValue)} />
              <MetricCard icon={TrendingUp} label="Valor ponderado" value={formatCurrency(snapshot.weightedOpenValue)} />
              <MetricCard icon={Clock3} label="Seguimientos vencidos" value={`${snapshot.followUpDueCount}`} />
              <MetricCard icon={Radar} label="Oportunidades enfriándose" value={`${snapshot.staleCount}`} />
            </div>
          </div>
        }
      />

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
            description="Listas accionables por ciudad, vertical o servicio."
            defaultName="Nueva campaña de cierre"
          />
        </div>

        <div className="space-y-4">
          <ProspectDetailPanel
            record={selected}
            showDemoBadges
            emptyText="Selecciona una oportunidad para abrir el informe."
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
    <PmPanel className="p-5">
      <h2 className="pm-title text-[1rem]">{title}</h2>
      <p className="pm-muted mt-2 text-sm leading-6">{description}</p>

      <div className="mt-4 space-y-3">
        {records.length === 0 ? <PmEmpty body="Sin oportunidades en este bloque." /> : null}

        {records.slice(0, 4).map((record) => (
          <button
            key={record.business.key}
            type="button"
            onClick={() => onSelect(record.business.key)}
            className="pm-card w-full p-4 text-left transition hover:border-[rgba(255,255,255,0.08)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--pm-text)]">{record.business.name}</p>
                <p className="mt-1 text-xs text-[var(--pm-text-secondary)]">{record.insight.service.shortLabel}</p>
              </div>
              <p className="text-sm font-semibold text-[var(--pm-text)]">{formatCurrency(record.insight.weightedValue)}</p>
            </div>
            <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">{record.insight.nextAction.action}</p>
          </button>
        ))}
      </div>
    </PmPanel>
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
    <PmPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="pm-title text-[1rem]">{stage.label}</h3>
          <p className="pm-caption mt-1">
            {stage.count} leads · score medio {stage.averageScore || "0"}
          </p>
        </div>
        <div className="text-right">
          <p className="pm-caption uppercase tracking-[0.14em]">Valor</p>
          <p className="pm-title mt-1 text-sm">{formatCurrency(stage.weightedValue)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {stage.records.length === 0 ? (
          <PmEmpty body="Sin oportunidades aquí." />
        ) : null}

        {stage.records.map((record) => (
          <button
            key={record.business.key}
            type="button"
            onClick={() => onSelect(record.business.key)}
            className={cn(
              "w-full rounded-[1.25rem] border p-3.5 text-left transition",
              selectedKey === record.business.key
                ? "border-[rgba(255,255,255,0.08)] bg-[rgba(24,29,36,0.86)] shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
                : "border-[var(--pm-border)] bg-[rgba(18,22,28,0.68)] hover:border-[rgba(255,255,255,0.07)]",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--pm-text)]">{record.business.name}</p>
                <p className="mt-1 text-xs text-[var(--pm-text-secondary)]">{record.insight.service.shortLabel}</p>
              </div>
              <p className="text-sm font-semibold text-[var(--pm-text)]">{record.insight.score}</p>
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
    </PmPanel>
  );
}

function PipelineSummary({ snapshot }: { snapshot: PipelineSnapshot }) {
  return (
    <PmPanel className="p-5 sm:p-6">
      <p className="pm-kicker">Resumen ejecutivo</p>
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
    </PmPanel>
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
  return <PmMetric icon={Icon} label={label} value={value} className="min-w-[170px]" />;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
      <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1.5 text-sm text-[var(--pm-text)]">{value}</p>
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
    <div className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--pm-text)]">{label}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--pm-text-secondary)]">{detail}</p>
        </div>
        <p className="text-base font-semibold text-[var(--pm-text)]">{value}</p>
      </div>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <section className="pm-panel px-5 py-6 text-sm text-[var(--pm-text-secondary)]">{text}</section>
  );
}
