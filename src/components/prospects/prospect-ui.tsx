"use client";

import { Flame, RefreshCw, Target } from "lucide-react";

import { STATUS_META } from "@/lib/constants";
import { OPPORTUNITY_META, type ProspectRecord, type UrgencyLevel } from "@/lib/prospect-intelligence";
import { cn, formatDateTime } from "@/lib/utils";

type ProspectCardProps = {
  record: ProspectRecord;
  onSelect?: (record: ProspectRecord) => void;
  actionLabel?: string;
};

export function OpportunityBadge({ record }: { record: ProspectRecord }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium", OPPORTUNITY_META[record.insight.tier].badgeClass)}>
      {record.insight.tierLabel}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: UrgencyLevel }) {
  const styles =
    urgency === "alta"
      ? "border-rose-500/70 bg-rose-500/15 text-rose-200"
      : urgency === "media"
        ? "border-amber-500/70 bg-amber-500/15 text-amber-200"
        : "border-slate-600 bg-slate-700/50 text-slate-200";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium", styles)}>
      Urgencia {urgency}
    </span>
  );
}

export function ProspectCard({ record, onSelect, actionLabel = "Abrir" }: ProspectCardProps) {
  const status = STATUS_META[record.business.status];
  const Icon = record.insight.isHot ? Flame : record.insight.needsFollowUp ? RefreshCw : Target;

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">{record.business.name}</p>
          <p className="mt-1 text-xs text-slate-400">
            {record.insight.sectorLabel} · {record.insight.cityLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Score</p>
          <p className="text-2xl font-semibold text-cyan-100">{record.insight.score}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", status.badgeClass)}>{status.label}</span>
        <OpportunityBadge record={record} />
        <UrgencyBadge urgency={record.insight.nextAction.urgency} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Servicio Orbita</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{record.insight.service.label}</p>
          <p className="mt-1 text-sm text-slate-400">{record.insight.service.reason}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Siguiente accion</p>
          <p className="mt-1 text-sm font-medium text-slate-100">{record.insight.nextAction.action}</p>
          <p className="mt-1 text-sm text-slate-400">
            {record.insight.nextAction.channel} · {record.insight.nextAction.reason}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Ultima interaccion: {formatDateTime(record.business.lastInteractionAt)}</p>
        {onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(record)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500"
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
