"use client";

import { useState } from "react";

import { mergeBusinesses } from "@/lib/business-helpers";
import { buildProspectRecords, buildTodayBuckets, type ProspectRecord } from "@/lib/prospect-intelligence";
import type { ProfileRow } from "@/lib/types";

import { ProspectDetailPanel } from "./prospect-detail-panel";
import { ProspectCard } from "./prospect-ui";
import { ScoringControls } from "./scoring-controls";
import { useSavedProspects } from "./use-saved-prospects";
import { useScoringConfig } from "./use-scoring-config";

type Props = {
  profile: ProfileRow;
};

export function TodayClient({ profile }: Props) {
  const { businesses, latestNotes, loading, error } = useSavedProspects();
  const { config, setConfig, reset, ready } = useScoringConfig();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const combinedBusinesses = mergeBusinesses({
    savedBusinesses: businesses,
    overpassBusinesses: [],
    latestNotes,
  });

  const records = buildProspectRecords(combinedBusinesses, config, profile.city_name);
  const buckets = buildTodayBuckets(records);
  const selected =
    records.find((record) => record.business.key === selectedKey) ?? buckets.prioritizedToday[0] ?? records[0] ?? null;

  if (loading || !ready) {
    return <PageState text="Preparando lista operativa del dia..." />;
  }

  if (error) {
    return <PageState text={error} />;
  }

  if (records.length === 0) {
    return (
      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1.4fr_0.9fr] lg:px-0">
        <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-5">
          <h1 className="text-xl font-semibold text-slate-100">Hoy</h1>
          <p className="mt-2 text-sm text-slate-400">
            Todavia no hay prospectos guardados. Empieza desde el mapa, guarda negocios y vuelve aqui para ver prioridades,
            seguimientos y mensajes sugeridos.
          </p>
        </section>
        <ScoringControls config={config} onChange={setConfig} onReset={reset} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 px-4 py-4 xl:grid-cols-[1.4fr_0.8fr] lg:px-0">
      <div className="space-y-4">
        <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Vista Hoy</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Prioridades comerciales de Orbita</h1>
          <p className="mt-2 text-sm text-slate-400">
            Prospectos ya ordenados por potencial, urgencia y mejor angulo comercial para atacar hoy.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Prioritarios hoy" value={buckets.prioritizedToday.length} />
            <StatCard label="Follow-ups pendientes" value={buckets.followUpsPending.length} />
            <StatCard label="Negocios calientes" value={buckets.hotLeads.length} />
            <StatCard label="Sin contactar potentes" value={buckets.highPotentialUntouched.length} />
          </div>
        </section>

        <ProspectSection
          title="Negocios prioritarios de hoy"
          description="Los que merecen accion inmediata por score o por seguimiento vencido."
          records={buckets.prioritizedToday}
          onSelect={(record) => setSelectedKey(record.business.key)}
        />

        <ProspectSection
          title="Follow-ups pendientes"
          description="Negocios ya tocados donde toca insistir antes de que se enfrien."
          records={buckets.followUpsPending}
          onSelect={(record) => setSelectedKey(record.business.key)}
        />

        <ProspectSection
          title="Negocios calientes"
          description="Prospectos con alta probabilidad de avance o muy buen encaje actual."
          records={buckets.hotLeads}
          onSelect={(record) => setSelectedKey(record.business.key)}
        />

        <ProspectSection
          title="Sin contactar con alto potencial"
          description="Oportunidades limpias para abrir prospeccion con buen angulo."
          records={buckets.highPotentialUntouched}
          onSelect={(record) => setSelectedKey(record.business.key)}
        />
      </div>

      <div className="space-y-4">
        <ProspectDetailPanel record={selected} />
        <ScoringControls config={config} onChange={setConfig} onReset={reset} />
      </div>
    </div>
  );
}

function ProspectSection({
  title,
  description,
  records,
  onSelect,
}: {
  title: string;
  description: string;
  records: ProspectRecord[];
  onSelect: (record: ProspectRecord) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>

      <div className="mt-4 space-y-3">
        {records.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-500">
            Nada que mostrar en este bloque todavia.
          </p>
        ) : null}
        {records.map((record) => (
          <ProspectCard key={record.business.key} record={record} onSelect={onSelect} actionLabel="Ver guion" />
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-cyan-100">{value}</p>
    </article>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="px-4 py-4 lg:px-0">
      <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-400">{text}</section>
    </div>
  );
}
