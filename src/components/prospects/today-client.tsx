"use client";

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
          Falta completar el perfil comercial de la cuenta. ProspectMap ya funciona, pero el scoring, los mensajes y el
          informe del negocio serán mucho mejores cuando completes el onboarding comercial en `Configuración`.
        </PmNotice>
      ) : null}

      {records.length === 0 ? (
        <PmHero
          eyebrow="Centro de control"
          title="Sin pipeline todavía"
          description="Empieza desde el mapa, guarda negocios y vuelve aquí. Esta vista se llena sola con prioridades, seguimiento, encaje de servicio y narrativa comercial por vertical."
        >
          <p className="pm-muted max-w-2xl text-sm leading-6">
            Empieza desde el mapa, guarda negocios y vuelve aquí. Esta vista se llena sola con prioridades, seguimiento,
            encaje de servicio y narrativa comercial por vertical.
          </p>
        </PmHero>
      ) : (
        <>
          <PmHero
            eyebrow="Centro de control"
            title="Hoy sabes exactamente dónde atacar."
            description="ProspectMap resume qué leads merecen foco inmediato, qué servicio de Órbita entra mejor y dónde se concentra la oportunidad real de la cuenta."
            actions={
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PmMetric label="Prioritarios hoy" value={summary.prioritizedCount} tone="cyan" className="min-w-[170px]" />
                <PmMetric label="Seguimientos vencidos" value={summary.followUpCount} tone="amber" className="min-w-[170px]" />
                <PmMetric label="Valor pipeline" value={formatCurrency(summary.estimatedValueTotal)} tone="rose" className="min-w-[170px]" />
                <PmMetric label="Leads enfriándose" value={summary.staleCount} tone="emerald" className="min-w-[170px]" />
              </div>
            }
          />

          <div className="grid gap-4 2xl:grid-cols-[1.45fr_0.95fr]">
            <div className="space-y-4">
              <ActionSummaryPanel summary={summary} />
              <OpportunityAlertsPanel alerts={alertFeed} onOpenBusiness={setSelectedKey} />
              <ConquestPanel
                snapshot={summary.conquest}
                title="Cómo va la conquista del territorio"
                description="Cobertura real, zonas con tracción y huecos claros donde todavía no estás atacando."
                onOpenBusiness={setSelectedKey}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                <ProspectSection
                  title="Negocios prioritarios de hoy"
                  description="Prioridad alta o follow-up vencido. El mejor sitio para concentrar energía comercial."
                  icon={Target}
                  records={buckets.prioritizedToday}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
                <ProspectSection
                  title="Follow-ups pendientes"
                  description="Prospectos ya tocados donde insistir hoy todavía tiene sentido."
                  icon={RefreshCw}
                  records={buckets.followUpsPending}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
                <ProspectSection
                  title="Negocios calientes"
                  description="Cuentas con mejor temperatura comercial y una narrativa clara."
                  icon={Flame}
                  records={buckets.hotLeads}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
                <ProspectSection
                  title="Sin contactar de alta oportunidad"
                  description="Pipeline limpio para abrir conversación con buen ángulo."
                  icon={Sparkles}
                  records={buckets.highPotentialUntouched}
                  showDemoBadges
                  onSelect={(record) => setSelectedKey(record.business.key)}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <DistributionPanel
                  title="Servicios con más encaje"
                  description="Dónde está hoy la palanca más vendible de Órbita."
                  items={summary.serviceDistribution.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                  emptyText="Aún no hay suficiente pipeline para detectar una señal clara."
                />
                <DistributionPanel
                  title="Oportunidad por vertical"
                  description="Concentración del pipeline según vertical detectada."
                  items={summary.marketVerticalDistribution.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                  emptyText="Sin distribución vertical todavía."
                />
                <DistributionPanel
                  title="Sectores dominantes"
                  description="Sectores con más volumen aprovechable ahora mismo."
                  items={summary.sectorDistribution}
                  emptyText="Sin sectores dominantes todavía."
                />
              </div>

              <PipelinePanel summary={summary} />
              <ProspectListsPanel
                userId={profile.id}
                records={records}
                title="Campañas operativas"
                description="Guarda focos de ataque reutilizables por vertical, servicio o ciudad."
                defaultName="Nueva campaña"
              />
            </div>

            <div className="space-y-4">
              <ProspectDetailPanel
                record={selected}
                showDemoBadges
                emptyText="Selecciona un prospecto para ver el guion comercial completo."
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
    <PmPanel className="p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-[rgba(242,138,46,0.38)] bg-[rgba(242,138,46,0.12)] p-2 text-[rgba(255,214,179,0.98)]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="pm-title text-sm uppercase tracking-[0.1em]">{title}</h2>
          <p className="pm-muted mt-1 text-sm">{description}</p>
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
    <PmPanel className="p-5">
      <PmSectionHeader
        eyebrow="Resumen accionable"
        title="Qué mover hoy para acercarte al cierre"
        action={<span className="pm-badge">Valor ponderado {formatCurrency(summary.weightedValueTotal)}</span>}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {summary.actionSummary.map((item) => (
          <article key={item} className="pm-card-soft">
            <p className="pm-muted text-sm leading-6">{item}</p>
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
    <PmPanel className="p-4">
      <h2 className="pm-title text-sm uppercase tracking-[0.1em]">{title}</h2>
      <p className="pm-muted mt-1 text-sm">{description}</p>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? <PmEmpty body={emptyText} /> : null}
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--pm-text)]">{item.label}</span>
              <span className="pm-caption">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-[rgba(7,17,31,0.72)]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[rgba(242,138,46,0.96)] to-[rgba(255,186,110,0.96)]"
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
    <PmPanel className="p-5">
      <p className="pm-kicker">Pipeline</p>
      <h2 className="pm-title mt-2 text-xl">Lectura rápida del momento comercial</h2>
      <p className="pm-muted mt-2 text-sm">
        Valor abierto {formatCurrency(summary.estimatedValueTotal)} · {summary.staleCount} oportunidades perdiendo
        timing.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {summary.pipelineMoments.map((item) => (
          <article key={item.label} className="pm-card-soft">
            <div className="flex items-center justify-between gap-3">
              <p className="pm-muted text-sm">{item.label}</p>
              <span className="pm-title text-lg">{item.value}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[rgba(7,17,31,0.72)]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[rgba(242,138,46,0.96)] to-[rgba(255,186,110,0.96)]"
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
    <PmPanel className="p-4">
      <p className="pm-kicker">Foco ejecutivo</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="pm-card-soft">
          <p className="pm-caption uppercase tracking-[0.14em]">Valor bruto</p>
          <p className="pm-title mt-1 text-base">{formatCurrency(summary.estimatedValueTotal)}</p>
        </div>
        <div className="pm-card-soft">
          <p className="pm-caption uppercase tracking-[0.14em]">Valor ponderado</p>
          <p className="pm-title mt-1 text-base">{formatCurrency(summary.weightedValueTotal)}</p>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {summary.actionSummary.map((item) => (
          <div key={item} className="pm-card-soft flex gap-3">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pm-primary)]" />
            <p className="pm-muted text-sm">{item}</p>
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
