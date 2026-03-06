"use client";

import { useMemo, useState, type ComponentType } from "react";
import { ArrowRight, Flame, RefreshCw, Sparkles, Target } from "lucide-react";

import { mergeBusinesses } from "@/lib/business-helpers";
import {
  buildCommandCenterSummary,
  buildProspectRecords,
  buildTodayBuckets,
  isAccountCommercialProfileComplete,
  type CommandCenterSummary,
  type ProspectRecord,
} from "@/lib/prospect-intelligence";
import type { ProfileRow } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

import { CommercialControlBar } from "../commercial/commercial-control-bar";
import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";

import { ProspectDetailPanel } from "./prospect-detail-panel";
import { ProspectListsPanel } from "./prospect-lists-panel";
import { ProspectCard } from "./prospect-ui";
import { useSavedProspects } from "./use-saved-prospects";

type Props = {
  profile: ProfileRow;
};

export function TodayClient({ profile }: Props) {
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
  const buckets = useMemo(() => buildTodayBuckets(records), [records]);
  const summary = useMemo(() => buildCommandCenterSummary(records, settings.vertical), [records, settings.vertical]);
  const commercialProfileComplete = isAccountCommercialProfileComplete(accountProfile);
  const selected =
    records.find((record) => record.business.key === selectedKey) ?? buckets.prioritizedToday[0] ?? records[0] ?? null;

  if (loading || !ready || !profileReady) {
    return <PageState text="Preparando command center comercial..." />;
  }

  if (error) {
    return <PageState text={error} />;
  }

  return (
    <div className="space-y-4 px-4 py-4 lg:px-0">
      <CommercialControlBar
        settings={settings}
        onVerticalChange={setVertical}
        saveState={saveState}
      />

      {!commercialProfileComplete ? (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Falta completar el perfil comercial de la cuenta. ProspectMap ya funciona, pero el scoring, los mensajes y el
          informe del negocio seran mucho mejores cuando completes el onboarding comercial en `Configuración`.
        </section>
      ) : null}

      {records.length === 0 ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.3)]">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Centro de control</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Sin pipeline todavía</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Empieza desde el mapa, guarda negocios y vuelve aquí. Esta vista se llena sola con prioridades, seguimiento,
            encaje de servicio y narrativa comercial por vertical.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))] p-6 shadow-[0_28px_80px_rgba(2,6,23,0.42)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Centro de control</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
                  Hoy sabes exactamente dónde atacar.
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  ProspectMap ya no es solo mapa y pipeline: esta vista resume qué leads merecen foco inmediato, qué
                  servicio de Órbita entra mejor y dónde se concentra la oportunidad real de la cuenta.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Prioritarios hoy" value={summary.prioritizedCount} tone="cyan" />
                <MetricCard label="Seguimientos vencidos" value={summary.followUpCount} tone="amber" />
                <MetricCard label="Valor pipeline" value={formatCurrency(summary.estimatedValueTotal)} tone="rose" />
                <MetricCard label="Leads enfriándose" value={summary.staleCount} tone="emerald" />
              </div>
            </div>
          </section>

          <div className="grid gap-4 2xl:grid-cols-[1.45fr_0.95fr]">
            <div className="space-y-4">
              <ActionSummaryPanel summary={summary} />

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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-cyan-800/50 bg-cyan-500/10 p-2 text-cyan-200">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-200">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {records.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-500">
            Nada que mostrar en este bloque todavía.
          </p>
        ) : null}
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
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "cyan" | "amber" | "rose" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : tone === "rose"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-100"
        : tone === "emerald"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";

  return (
    <article className={cn("min-w-[170px] rounded-2xl border p-4", toneClass)}>
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </article>
  );
}

function ActionSummaryPanel({ summary }: { summary: CommandCenterSummary }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Resumen accionable</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-100">Qué mover hoy para acercarte al cierre</h2>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
          Valor ponderado {formatCurrency(summary.weightedValueTotal)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {summary.actionSummary.map((item) => (
          <article key={item} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <p className="text-sm leading-6 text-slate-300">{item}</p>
          </article>
        ))}
      </div>
    </section>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-200">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="text-sm text-slate-500">{emptyText}</p> : null}
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-200">{item.label}</span>
              <span className="text-slate-500">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PipelinePanel({ summary }: { summary: CommandCenterSummary }) {
  const max = Math.max(...summary.pipelineMoments.map((item) => item.value), 1);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Pipeline</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-100">Lectura rápida del momento comercial</h2>
      <p className="mt-2 text-sm text-slate-400">
        Valor abierto {formatCurrency(summary.estimatedValueTotal)} · {summary.staleCount} oportunidades perdiendo
        timing.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {summary.pipelineMoments.map((item) => (
          <article key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-300">{item.label}</p>
              <span className="text-lg font-semibold text-slate-100">{item.value}</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-200"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RightRailSummary({ summary }: { summary: CommandCenterSummary }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Foco ejecutivo</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Valor bruto</p>
          <p className="mt-1 text-base font-semibold text-slate-100">{formatCurrency(summary.estimatedValueTotal)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Valor ponderado</p>
          <p className="mt-1 text-base font-semibold text-slate-100">{formatCurrency(summary.weightedValueTotal)}</p>
        </div>
      </div>
      <div className="mt-3 space-y-3">
        {summary.actionSummary.map((item) => (
          <div key={item} className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <p className="text-sm text-slate-300">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="px-4 py-4 lg:px-0">
      <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-400">{text}</section>
    </div>
  );
}
