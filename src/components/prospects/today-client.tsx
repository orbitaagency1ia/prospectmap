"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import { ArrowRight, Flame, RefreshCw, Sparkles, Target } from "lucide-react";

import { mergeBusinesses } from "@/lib/business-helpers";
import {
  buildCommandCenterSummary,
  buildProspectRecords,
  buildTodayBuckets,
  type OpportunityAlert,
  isAccountCommercialProfileComplete,
  type CommandCenterSummary,
  type ProspectRecord,
} from "@/lib/prospect-intelligence";
import type { ProfileRow } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

import { CommercialControlBar } from "../commercial/commercial-control-bar";
import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { PmEmpty, PmHero, PmMetric, PmNotice, PmPanel, PmSectionHeader } from "../ui/pm";

import { ProspectDetailPanel } from "./prospect-detail-panel";
import { ConquestPanel, OpportunityAlertsPanel } from "./intelligence-panels";
import { ProspectListsPanel } from "./prospect-lists-panel";
import { ProspectCard } from "./prospect-ui";
import { useProspectLists } from "./use-prospect-lists";
import { useSavedProspects } from "./use-saved-prospects";

type Props = {
  profile: ProfileRow;
};

export function TodayClient({ profile }: Props) {
  const { businesses, latestNotes, loading, error } = useSavedProspects();
  const { settings, ready, saveState, setVertical } = useCommercialConfig(profile.id);
  const { profile: accountProfile, ready: profileReady } = useAccountCommercialProfile(profile.id);
  const { lists, items } = useProspectLists(profile.id);
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
  const buckets = useMemo(() => buildTodayBuckets(records), [records]);
  const summary = useMemo(() => buildCommandCenterSummary(records, settings.vertical), [records, settings.vertical]);
  const listAlerts = useMemo(() => {
    const itemMap = new Map<string, string[]>();

    items.forEach((item) => {
      itemMap.set(item.list_id, [...(itemMap.get(item.list_id) ?? []), item.business_id]);
    });

    const businessMap = new Map(
      records
        .map((record) => [record.business.business?.id ?? null, record] as const)
        .filter((entry): entry is [string, ProspectRecord] => Boolean(entry[0])),
    );

    return lists
      .filter((list) => list.status === "activa" || list.status === "en_curso")
      .map<OpportunityAlert | null>((list) => {
        const linked = (itemMap.get(list.id) ?? [])
          .map((businessId) => businessMap.get(businessId))
          .filter((record): record is ProspectRecord => Boolean(record));

        const urgent = linked.filter((record) => record.insight.followUpDue || record.insight.coolingDown);
        const untouched = linked.filter((record) => record.business.status === "sin_contactar");

        if (linked.length === 0 || (urgent.length === 0 && untouched.length < 3)) {
          return null;
        }

        const top = urgent[0] ?? untouched[0] ?? linked[0];

        return {
          id: `list-${list.id}`,
          kind: "stalled_list",
          title: `${list.name} está perdiendo ritmo`,
          summary: `${urgent.length} leads con urgencia y ${untouched.length} todavía sin tocar.`,
          reason: "La campaña tiene oportunidad viva, pero necesita movimiento para no quedarse parada.",
          actionLabel: "Abrir mejor cuenta",
          urgency: urgent.length > 0 ? "alta" : "media",
          businessKey: top?.business.key,
        };
      })
      .filter((alert): alert is OpportunityAlert => Boolean(alert));
  }, [items, lists, records]);
  const alertFeed = useMemo(() => [...summary.alerts, ...listAlerts].slice(0, 8), [listAlerts, summary.alerts]);
  const commercialProfileComplete = isAccountCommercialProfileComplete(accountProfile);
  const selected =
    records.find((record) => record.business.key === selectedKey) ?? buckets.prioritizedToday[0] ?? records[0] ?? null;

  if (loading || !ready || !profileReady) {
    return <PageState text="Preparando centro de control..." />;
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
          Completa el perfil comercial en `Configuración` para afinar scoring, mensajes e informe.
        </PmNotice>
      ) : null}

      {records.length === 0 ? (
        <PmHero
          eyebrow="Centro de control"
          title="Todavía no hay pipeline"
          description="Guarda cuentas desde el mapa y esta vista se completará sola."
        >
          <p className="pm-muted max-w-2xl text-sm leading-6">Empieza en Territorio.</p>
        </PmHero>
      ) : (
        <>
          <PmHero
            eyebrow="Centro de control"
            title="Control del día."
            description="Lo urgente, lo valioso y lo que merece movimiento ahora."
            actions={
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="pm-caption">Siguiente foco</p>
                  <p className="text-sm leading-6 text-[var(--pm-text)]">
                    {summary.actionSummary[0] ?? "La cola del día ya está lista."}
                  </p>
                </div>
                <Link href="/attack?source=alerts" className="pm-btn pm-btn-primary w-full">
                  <ArrowRight className="h-4 w-4" />
                  Abrir Ataque del día
                </Link>
              </div>
            }
          >
            <div className="pm-hero-metrics">
              <PmMetric label="Prioritarios hoy" value={summary.prioritizedCount} className="min-w-[170px]" />
              <PmMetric label="Seguimientos" value={summary.followUpCount} tone="amber" className="min-w-[170px]" />
              <PmMetric label="Valor abierto" value={formatCurrency(summary.estimatedValueTotal)} tone="violet" className="min-w-[170px]" />
              <PmMetric label="Enfriándose" value={summary.staleCount} tone="emerald" className="min-w-[170px]" />
            </div>
          </PmHero>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.36fr)_430px]">
            <div className="space-y-5">
              <ActionSummaryPanel summary={summary} />
              <OpportunityAlertsPanel
                alerts={alertFeed}
                onOpenBusiness={setSelectedKey}
                action={
                  <Link href="/attack?source=alerts" className="pm-btn pm-btn-secondary">
                    <ArrowRight className="h-4 w-4" />
                    Abrir
                  </Link>
                }
              />
              <ConquestPanel
                snapshot={summary.conquest}
                title="Conquista del territorio"
                description="Cobertura, tracción y huecos por atacar."
                onOpenBusiness={setSelectedKey}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                <ProspectSection
                  title="Negocios prioritarios de hoy"
                  description="Alta prioridad o seguimiento vencido."
                  icon={Target}
                  records={buckets.prioritizedToday}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
                <ProspectSection
                  title="Follow-ups pendientes"
                  description="Cuentas que conviene retomar hoy."
                  icon={RefreshCw}
                  records={buckets.followUpsPending}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
                <ProspectSection
                  title="Negocios calientes"
                  description="Señal fuerte y narrativa clara."
                  icon={Flame}
                  records={buckets.hotLeads}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
                <ProspectSection
                  title="Sin contactar de alta oportunidad"
                  description="Buen encaje y conversación por abrir."
                  icon={Sparkles}
                  records={buckets.highPotentialUntouched}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <DistributionPanel
                  title="Servicios con más encaje"
                  description="Dónde hay más encaje hoy."
                  items={summary.serviceDistribution.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                  emptyText="Aún no hay suficiente pipeline para detectar una señal clara."
                />
                <DistributionPanel
                  title="Oportunidad por vertical"
                  description="Concentración actual del pipeline."
                  items={summary.marketVerticalDistribution.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                  emptyText="Sin distribución vertical todavía."
                />
                <DistributionPanel
                  title="Sectores dominantes"
                  description="Sectores con más volumen útil."
                  items={summary.sectorDistribution}
                  emptyText="Sin sectores dominantes todavía."
                />
              </div>

              <PipelinePanel summary={summary} />
              <ProspectListsPanel
                userId={profile.id}
                records={records}
                title="Campañas operativas"
                description="Focos reutilizables por vertical, servicio o ciudad."
                defaultName="Nueva campaña"
              />
            </div>

            <div className="space-y-4 2xl:sticky 2xl:top-[7.75rem] 2xl:self-start">
              <ProspectDetailPanel
                record={selected}
                showDemoBadges
                emptyText="Selecciona un prospecto para ver el guion."
              />
              <RightRailSummary summary={summary} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ProspectSection({
  title,
  description,
  icon: Icon,
  records,
  showDemoBadges,
  onSelect,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  records: ProspectRecord[];
  showDemoBadges: boolean;
  onSelect: (record: ProspectRecord) => void;
}) {
  return (
    <PmPanel className="p-5">
      <div className="flex items-start gap-3">
        <div className="pm-focus-pane flex h-11 w-11 items-center justify-center rounded-[1rem] p-0 text-[var(--pm-text)] shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="pm-title text-[1rem]">{title}</h2>
          <p className="pm-muted mt-2 text-sm leading-6">{description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {records.length === 0 ? <PmEmpty body="Nada que mover en este bloque todavía." /> : null}
        {records.map((record) => (
          <ProspectCard
            key={record.business.key}
            record={record}
            showDemoBadges={showDemoBadges}
            onSelect={onSelect}
            actionLabel="Abrir guion"
          />
        ))}
      </div>
    </PmPanel>
  );
}

function ActionSummaryPanel({ summary }: { summary: CommandCenterSummary }) {
  return (
    <PmPanel className="p-5 sm:p-6">
      <PmSectionHeader
        eyebrow="Resumen accionable"
        title="Qué mover hoy"
        action={<span className="pm-badge">Ponderado {formatCurrency(summary.weightedValueTotal)}</span>}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {summary.actionSummary.map((item) => (
          <article key={item} className="pm-list-row rounded-[1rem] px-4 py-4">
            <p className="pm-muted text-sm leading-7">{item}</p>
          </article>
        ))}
      </div>
    </PmPanel>
  );
}

function DistributionPanel({
  title,
  description,
  items,
  emptyText,
}: {
  title: string;
  description: string;
  items: Array<{ label: string; value: number }>;
  emptyText: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <PmPanel className="p-5">
      <h2 className="pm-title text-[1rem]">{title}</h2>
      <p className="pm-muted mt-2 text-sm leading-6">{description}</p>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? <PmEmpty body={emptyText} /> : null}
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--pm-text)]">{item.label}</span>
              <span className="pm-caption">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-[rgba(255,255,255,0.04)]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[rgba(255,255,255,0.72)] to-[rgba(255,255,255,0.24)]"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </PmPanel>
  );
}

function PipelinePanel({ summary }: { summary: CommandCenterSummary }) {
  const max = Math.max(...summary.pipelineMoments.map((item) => item.value), 1);

  return (
    <PmPanel className="p-5 sm:p-6">
      <p className="pm-kicker">Pipeline</p>
      <h2 className="pm-title mt-3 text-[1.35rem]">Estado del cierre</h2>
      <p className="pm-muted mt-3 text-sm leading-6">
        Valor abierto {formatCurrency(summary.estimatedValueTotal)} · {summary.staleCount} oportunidades perdiendo
        timing.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {summary.pipelineMoments.map((item) => (
          <article key={item.label} className="pm-list-row rounded-[1rem] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="pm-muted text-sm">{item.label}</p>
              <span className="pm-title text-lg">{item.value}</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-[rgba(255,255,255,0.04)]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[rgba(255,255,255,0.72)] to-[rgba(255,255,255,0.24)]"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </PmPanel>
  );
}

function RightRailSummary({ summary }: { summary: CommandCenterSummary }) {
  return (
    <PmPanel className="p-5">
      <p className="pm-kicker">Radar ejecutivo</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="pm-list-row rounded-[1rem] px-4 py-4">
          <p className="pm-caption uppercase tracking-[0.14em]">Valor bruto</p>
          <p className="pm-title mt-1 text-base">{formatCurrency(summary.estimatedValueTotal)}</p>
        </div>
        <div className="pm-list-row rounded-[1rem] px-4 py-4">
          <p className="pm-caption uppercase tracking-[0.14em]">Valor ponderado</p>
          <p className="pm-title mt-1 text-base">{formatCurrency(summary.weightedValueTotal)}</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {summary.actionSummary.map((item) => (
          <div key={item} className="pm-list-row rounded-[1rem] px-4 py-4">
            <div className="flex gap-3">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pm-text)]" />
              <p className="pm-muted text-sm">{item}</p>
            </div>
          </div>
        ))}
      </div>
    </PmPanel>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="pm-page">
      <section className="pm-panel text-sm text-[var(--pm-text-secondary)]">{text}</section>
    </div>
  );
}
