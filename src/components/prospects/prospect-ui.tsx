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
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", OPPORTUNITY_META[record.insight.tier].badgeClass)}>
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

  return (
    <article className="pm-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--pm-text)]">{record.business.name}</p>
          <p className="mt-1 text-xs text-[var(--pm-text-secondary)]">
            {record.insight.sectorLabel} · {record.insight.cityLabel}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--pm-text-secondary)]">{record.insight.painPoint}</p>
        </div>
        <div className="rounded-2xl border border-[rgba(30,51,80,0.86)] bg-[rgba(7,17,31,0.62)] px-3 py-2 text-left sm:min-w-[88px] sm:text-right">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--pm-text-tertiary)]">Prioridad</p>
          <p className="text-2xl font-semibold text-[rgba(184,235,255,0.98)]">{record.insight.score}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", status.badgeClass)}>{status.label}</span>
        <OpportunityBadge record={record} />
        <UrgencyBadge urgency={record.insight.nextAction.urgency} />
        <span className="pm-badge">
          {record.insight.effectiveVerticalLabel}
        </span>
        <span className="pm-badge">
          {record.insight.service.shortLabel}
        </span>
        {showDemoBadges
          ? record.insight.demoBadges.slice(0, 2).map((badge) => (
              <span
                key={`${record.business.key}-${badge.label}`}
                className={cn(
                  "inline-flex rounded-full border px-2 py-1 text-xs font-medium",
                  badge.tone === "emerald"
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                    : badge.tone === "amber"
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                      : badge.tone === "violet"
                        ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                        : badge.tone === "cyan"
                          ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                          : "border-slate-600 bg-slate-700/50 text-slate-200",
                )}
              >
                {badge.label}
              </span>
            ))
          : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="pm-card-soft">
          <p className="pm-caption uppercase tracking-[0.12em]">Servicio Órbita</p>
          <p className="mt-1 text-sm font-medium text-[var(--pm-text)]">{record.insight.service.label}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--pm-text-secondary)]">{record.insight.service.reason}</p>
        </div>
        <div className="pm-card-soft">
          <p className="pm-caption uppercase tracking-[0.12em]">Qué hacer ahora</p>
          <p className="mt-1 text-sm font-medium text-[var(--pm-text)]">{record.insight.nextAction.action}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--pm-text-secondary)]">
            {record.insight.nextAction.channel} · {record.insight.nextAction.reason}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="pm-card-soft">
          <p className="pm-caption uppercase tracking-[0.12em]">Foco comercial</p>
          <p className="mt-1 text-sm leading-6 text-[var(--pm-text-secondary)]">{record.insight.commercialFocus}</p>
        </div>
        <div className="pm-card-soft">
          <p className="pm-caption uppercase tracking-[0.12em]">Valor estimado</p>
          <p className="mt-1 text-sm font-medium text-[var(--pm-text)]">{formatCurrency(record.insight.estimatedValue)}</p>
          <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{record.insight.estimatedValueLabel}</p>
        </div>
        <div className="pm-card-soft">
          <p className="pm-caption uppercase tracking-[0.12em]">Atención</p>
          <p className="mt-1 text-sm font-medium text-[var(--pm-text)]">{record.insight.attentionLabel}</p>
          <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{formatDaysSince(record.insight.daysSinceTouch)} sin tocar</p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--pm-text-tertiary)]">Última interacción: {formatDateTime(record.business.lastInteractionAt)}</p>
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(record)}
            className="pm-btn pm-btn-secondary w-full sm:w-auto"
          >
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
