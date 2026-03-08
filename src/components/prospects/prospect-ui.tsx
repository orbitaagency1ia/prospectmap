"use client";

import { Flame, RefreshCw, Target } from "lucide-react";

import { STATUS_META } from "@/lib/constants";
import { OPPORTUNITY_META, type ProspectRecord, type UrgencyLevel } from "@/lib/prospect-intelligence";
import { cn, formatCurrency, formatDateTime, formatDaysSince } from "@/lib/utils";

import { PmBadge } from "../ui/pm";

type ProspectCardProps = {
  record: ProspectRecord;
  onSelect?: (record: ProspectRecord) => void;
  actionLabel?: string;
  showDemoBadges?: boolean;
};

export function OpportunityBadge({ record }: { record: ProspectRecord }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", OPPORTUNITY_META[record.insight.tier].badgeClass)}>
      {record.insight.tierLabel}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  return <PmBadge tone={urgency === "alta" ? "rose" : urgency === "media" ? "amber" : "neutral"}>Urgencia {urgency}</PmBadge>;
}

export function ProspectCard({ record, onSelect, actionLabel = "Abrir", showDemoBadges = false }: ProspectCardProps) {
  const status = STATUS_META[record.business.status];
  const Icon = record.insight.isHot ? Flame : record.insight.needsFollowUp ? RefreshCw : Target;
  const badgeToneMap = {
    emerald: "emerald",
    amber: "amber",
    violet: "violet",
    cyan: "cyan",
    slate: "neutral",
    neutral: "neutral",
  } as const;

  return (
    <article className="pm-card px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", status.badgeClass)}>{status.label}</span>
            <OpportunityBadge record={record} />
            <UrgencyBadge urgency={record.insight.nextAction.urgency} />
          </div>
          <h3 className="pm-title mt-3 text-[1.08rem] leading-tight">{record.business.name}</h3>
          <p className="pm-muted mt-2 text-sm">
            {record.insight.sectorLabel} · {record.insight.cityLabel} · {record.insight.effectiveVerticalLabel}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--pm-text-secondary)]">{record.insight.attackSummary}</p>
        </div>

        <div className="rounded-[1.15rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.03)] px-3.5 py-3 text-right shadow-[var(--pm-shadow-line)]">
          <p className="pm-caption uppercase tracking-[0.16em]">Prioridad</p>
          <p className="pm-title mt-2 text-[1.75rem] leading-none">{record.insight.score}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PmBadge>{record.insight.service.shortLabel}</PmBadge>
        <PmBadge tone="amber">{record.insight.estimatedValueLabel}</PmBadge>
        {showDemoBadges
          ? record.insight.demoBadges.slice(0, 2).map((badge) => (
              <PmBadge key={`${record.business.key}-${badge.label}`} tone={badgeToneMap[badge.tone] ?? "neutral"}>
                {badge.label}
              </PmBadge>
            ))
          : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.8fr]">
        <InfoSlice label="Qué hacer ahora" value={record.insight.nextAction.action} detail={`${record.insight.nextAction.channel} · ${record.insight.nextAction.reason}`} />
        <InfoSlice label="Servicio recomendado" value={record.insight.service.label} detail={record.insight.service.reason} />
        <InfoSlice label="Valor y timing" value={formatCurrency(record.insight.estimatedValue)} detail={`${formatDaysSince(record.insight.daysSinceTouch)} sin tocar`} />
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-[var(--pm-border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--pm-text-tertiary)]">Última interacción: {formatDateTime(record.business.lastInteractionAt)}</p>
        {onSelect ? (
          <button type="button" onClick={() => onSelect(record)} className="pm-btn pm-btn-secondary w-full sm:w-auto">
            <span className="inline-flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {actionLabel}
            </span>
          </button>
        ) : null}
      </div>
    </article>
  );
}

function InfoSlice({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3.5">
      <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-[var(--pm-text)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--pm-text-secondary)]">{detail}</p>
    </div>
  );
}
