"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Compass, Flame, Radar, TimerReset } from "lucide-react";

import type { ConquestSnapshot, ConquestZoneSummary, OpportunityAlert } from "@/lib/prospect-intelligence";
import { cn, formatCurrency } from "@/lib/utils";

import { PmBadge, PmEmpty, PmMetric, PmPanel, PmSectionHeader } from "../ui/pm";

const alertToneClass = {
  alta: "border-[rgba(217,101,115,0.34)] bg-[rgba(217,101,115,0.12)]",
  media: "border-[rgba(228,167,57,0.3)] bg-[rgba(228,167,57,0.1)]",
  baja: "border-[rgba(42,52,66,0.9)] bg-[rgba(23,28,36,0.72)]",
} as const;

export function OpportunityAlertsPanel({
  alerts,
  onOpenBusiness,
  action,
}: {
  alerts: OpportunityAlert[];
  onOpenBusiness?: (businessKey: string) => void;
  action?: ReactNode;
}) {
  return (
    <PmPanel className="p-5">
      <PmSectionHeader
        eyebrow="Alertas de oportunidad"
        title="Lo que no deberías dejar para más tarde"
        description="Señales automáticas basadas en valor, urgencia, seguimiento y territorio para darte una razón real para abrir la app cada día."
        action={action}
      />

      <div className="mt-4 space-y-3">
        {alerts.length === 0 ? (
          <PmEmpty body="No hay alertas críticas ahora mismo. El foco del día está bajo control." />
        ) : null}

        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={cn(
              "rounded-[24px] border p-4 shadow-[0_14px_36px_rgba(3,9,18,0.18)] transition hover:-translate-y-[1px]",
              alertToneClass[alert.urgency],
            )}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <PmBadge tone={alert.urgency === "alta" ? "rose" : alert.urgency === "media" ? "amber" : "neutral"}>
                    Urgencia {alert.urgency}
                  </PmBadge>
                  {alert.zoneLabel ? <span className="pm-badge">{alert.zoneLabel}</span> : null}
                </div>
                <h3 className="text-base font-semibold text-[var(--pm-text)]">{alert.title}</h3>
                <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{alert.summary}</p>
                <p className="text-xs text-[var(--pm-text-tertiary)]">{alert.reason}</p>
              </div>

              {alert.businessKey && onOpenBusiness ? (
                <button type="button" className="pm-btn pm-btn-primary w-full lg:w-auto" onClick={() => onOpenBusiness(alert.businessKey!)}>
                  {alert.actionLabel}
                </button>
              ) : (
                <div className="pm-badge self-start">{alert.actionLabel}</div>
              )}
            </div>
          </article>
        ))}
      </div>
    </PmPanel>
  );
}

export function ConquestPanel({
  snapshot,
  title = "Modo conquista",
  description = "Lectura táctica del territorio para entender cobertura, zonas calientes y espacio desaprovechado.",
  compact = false,
  onOpenBusiness,
}: {
  snapshot: ConquestSnapshot;
  title?: string;
  description?: string;
  compact?: boolean;
  onOpenBusiness?: (businessKey: string) => void;
}) {
  return (
    <PmPanel className={cn("p-5", compact && "p-4")}>
      <PmSectionHeader eyebrow="Modo conquista" title={title} description={description} />

      <div className={cn("mt-4 grid gap-3", compact ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-4")}>
        <PmMetric label="Territorio trabajado" value={`${snapshot.coveragePercent}%`} icon={Compass} tone="amber" />
        <PmMetric label="Negocios trabajados" value={snapshot.workedCount} helper={`${snapshot.untouchedCount} sin tocar`} icon={Radar} />
        <PmMetric label="Pipeline vivo" value={snapshot.openCount} helper={formatCurrency(snapshot.weightedValue)} icon={Flame} />
        <PmMetric label="Leads calientes" value={snapshot.hotLeadCount} helper={snapshot.scopeLabel} icon={AlertTriangle} tone="rose" />
      </div>

      <div className={cn("mt-4 grid gap-4", compact ? "xl:grid-cols-3" : "xl:grid-cols-[0.95fr_1fr_1fr]")}>
        <ZoneList
          title="Cobertura comercial"
          items={snapshot.liveZones}
          emptyText="Sin zonas con pipeline vivo todavía."
          tone="neutral"
          onOpenBusiness={onOpenBusiness}
        />
        <ZoneList
          title="Zonas calientes"
          items={snapshot.hotZones}
          emptyText="Todavía no aparece una zona caliente clara."
          tone="amber"
          onOpenBusiness={onOpenBusiness}
        />
        <ZoneList
          title="Zonas desaprovechadas"
          items={snapshot.underusedZones}
          emptyText="No hay bolsillos claros de territorio sin cubrir."
          tone="rose"
          onOpenBusiness={onOpenBusiness}
        />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {snapshot.coverageNarrative.map((item) => (
          <div key={item} className="pm-card-soft flex gap-3">
            <TimerReset className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pm-primary)]" />
            <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{item}</p>
          </div>
        ))}
      </div>
    </PmPanel>
  );
}

function ZoneList({
  title,
  items,
  emptyText,
  tone,
  onOpenBusiness,
}: {
  title: string;
  items: ConquestZoneSummary[];
  emptyText: string;
  tone: "neutral" | "amber" | "rose";
  onOpenBusiness?: (businessKey: string) => void;
}) {
  return (
    <section className="space-y-3">
      <p className="pm-caption uppercase tracking-[0.14em]">{title}</p>

      {items.length === 0 ? <PmEmpty body={emptyText} /> : null}

      {items.map((zone) => (
        <article key={zone.key} className="pm-card-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--pm-text)]">{zone.label}</p>
                <PmBadge tone={tone}>{zone.coveragePercent}% cubierto</PmBadge>
              </div>
              <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">
                {zone.totalCount} negocios · {zone.openCount} abiertos · {zone.untouchedCount} sin tocar
              </p>
            </div>
            <div className="text-right">
              <p className="pm-caption uppercase tracking-[0.14em]">Valor</p>
              <p className="mt-1 text-sm font-semibold text-[var(--pm-text)]">{formatCurrency(zone.weightedValue)}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="pm-badge">{zone.highPotentialCount} con alta señal</span>
            <span className="pm-badge">{zone.hotLeadCount} calientes</span>
          </div>

          {zone.topBusinessKey && zone.topBusinessName && onOpenBusiness ? (
            <button type="button" className="pm-btn pm-btn-secondary mt-3 w-full" onClick={() => onOpenBusiness(zone.topBusinessKey!)}>
              Abrir {zone.topBusinessName}
            </button>
          ) : null}
        </article>
      ))}
    </section>
  );
}
