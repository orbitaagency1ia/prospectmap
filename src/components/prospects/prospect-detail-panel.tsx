"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { STATUS_META } from "@/lib/constants";
import { OPPORTUNITY_META, type ProspectRecord } from "@/lib/prospect-intelligence";
import { cn, formatCurrency, formatDateTime, formatDaysSince } from "@/lib/utils";

import { PmBadge, PmEmpty, PmPanel } from "../ui/pm";

import { ProspectingPrepSheet } from "./prospecting-prep-sheet";

type Props = {
  record: ProspectRecord | null;
  emptyText?: string;
  showDemoBadges?: boolean;
};

export function ProspectDetailPanel({
  record,
  emptyText = "Selecciona un prospecto para ver acción, servicio y mensajes sugeridos.",
  showDemoBadges = false,
}: Props) {
  const [showPrep, setShowPrep] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!record) {
    return <PmEmpty body={emptyText} />;
  }

  const status = STATUS_META[record.business.status];
  const opportunity = OPPORTUNITY_META[record.insight.tier];

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  };

  return (
    <>
      <PmPanel className="space-y-4 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="pm-kicker">Informe comercial</p>
            <h2 className="pm-title mt-2 text-lg">{record.business.name}</h2>
            <p className="pm-muted mt-1 text-sm">
              {record.insight.sectorLabel} · {record.insight.cityLabel}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => handleCopy("initial", record.insight.messages.initial)}
              className="pm-btn pm-btn-secondary w-full sm:w-auto"
            >
              <Copy className="h-4 w-4" />
              {copied === "initial" ? "Mensaje copiado" : "Copiar mensaje"}
            </button>
            <button
              type="button"
              onClick={() => setShowPrep(true)}
              className="pm-btn pm-btn-primary w-full sm:w-auto"
            >
              Preparar prospección
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", status.badgeClass)}>{status.label}</span>
          <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", opportunity.badgeClass)}>
            {record.insight.tierLabel}
          </span>
          <PmBadge tone="cyan">Prioridad comercial {record.insight.score}</PmBadge>
          <span className="pm-badge">{record.insight.effectiveVerticalLabel}</span>
          <span className="pm-badge">{record.insight.service.fitLabel}</span>
        </div>

        {showDemoBadges && record.insight.demoBadges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {record.insight.demoBadges.map((badge) => (
              <span
                key={badge.label}
                className={cn(
                  "inline-flex rounded-full border px-2 py-1 text-xs font-medium",
                  badge.tone === "emerald"
                    ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
                    : badge.tone === "amber"
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                      : badge.tone === "violet"
                        ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                        : badge.tone === "cyan"
                          ? "border-[rgba(242,138,46,0.5)] bg-[rgba(242,138,46,0.12)] text-[rgba(255,214,179,0.98)]"
                          : "border-slate-600 bg-slate-700/50 text-slate-200",
                )}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        <InfoBlock title="Resumen ejecutivo" body={record.insight.executiveSummary}>
          <p className="text-sm text-slate-300">{record.insight.fitSummary}</p>
        </InfoBlock>

        <InfoBlock title="Por qué atacarlo" body={record.insight.attackSummary}>
          <div className="mt-2 grid gap-3 xl:grid-cols-2">
            <InfoPill label="Valor estimado" value={formatCurrency(record.insight.estimatedValue)} />
            <InfoPill label="Valor ponderado" value={formatCurrency(record.insight.weightedValue)} />
            <InfoPill label="Atención" value={record.insight.attentionLabel} />
            <InfoPill label="Días sin tocar" value={formatDaysSince(record.insight.daysSinceTouch)} />
          </div>
          <p className="mt-3 text-sm text-slate-300">{record.insight.riskSummary}</p>
        </InfoBlock>

        <InfoBlock title="Dolor principal detectado" body={record.insight.painPoint}>
          <p className="text-sm text-slate-300">{record.insight.commercialFocus}</p>
        </InfoBlock>

        <InfoBlock title="Siguiente mejor acción" body={record.insight.nextAction.action}>
          <p className="text-sm text-slate-300">
            {record.insight.nextAction.channel} · {record.insight.nextAction.reason}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Urgencia: {record.insight.nextAction.urgency} · Probabilidad de cierre:{" "}
            {Math.round(record.insight.closeProbability * 100)}%
          </p>
        </InfoBlock>

        <InfoBlock title="Servicio Órbita recomendado" body={record.insight.service.label}>
          <p className="text-sm text-slate-300">{record.insight.service.reason}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            {record.insight.service.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        </InfoBlock>

        <div className="grid gap-4 xl:grid-cols-2">
          <InfoBlock title="Ángulo comercial recomendado" body={record.insight.commercialAngle}>
            <p className="text-sm text-slate-300">{record.insight.ctaSuggestion}</p>
          </InfoBlock>
          <InfoBlock title="Qué revisar antes de contactar" body={record.insight.reviewChecklist[0] ?? "Sin checklist adicional"}>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              {record.insight.reviewChecklist.slice(1).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </InfoBlock>
        </div>

        <section className="space-y-2">
          <p className="pm-caption uppercase tracking-[0.14em]">Mensajes sugeridos</p>
          <MessageBlock title="Mensaje inicial" content={record.insight.messages.initial} />
          <MessageBlock title="Follow-up 1" content={record.insight.messages.followUp1} />
          <MessageBlock title="Follow-up 2" content={record.insight.messages.followUp2} />
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="space-y-2">
            <p className="pm-caption uppercase tracking-[0.14em]">Qué lo hace encajar</p>
            <Checklist items={record.insight.fitSignals} />
          </section>
          <section className="space-y-2">
            <p className="pm-caption uppercase tracking-[0.14em]">Riesgos / qué falta revisar</p>
            <Checklist items={[...record.insight.riskSignals, ...record.insight.missingData]} />
          </section>
        </div>

        <section className="space-y-2">
          <p className="pm-caption uppercase tracking-[0.14em]">Objeciones probables</p>
          {record.insight.objections.map((item) => (
            <article key={item.objection} className="pm-card-soft">
              <p className="text-sm font-medium text-[var(--pm-text)]">{item.objection}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--pm-text-secondary)]">{item.response}</p>
            </article>
          ))}
        </section>

        <section className="space-y-2">
          <p className="pm-caption uppercase tracking-[0.14em]">Lógica del score</p>
          {record.insight.breakdown.map((item) => (
            <div key={item.key} className="pm-card-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--pm-text)]">{item.label}</p>
                <p
                  className={cn(
                    "font-mono text-sm",
                    item.direction === "minus" ? "text-rose-300" : "text-[var(--pm-primary)]",
                  )}
                >
                  {item.direction === "minus" ? "-" : "+"}
                  {item.value.toFixed(1)} / {item.max}
                </p>
              </div>
              <p className="mt-1 text-xs text-[var(--pm-text-tertiary)]">{item.reason}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="pm-card-soft text-xs text-[var(--pm-text-tertiary)]">
            Última interacción: {formatDateTime(record.business.lastInteractionAt)}
          </div>
          <div className="pm-card-soft text-xs text-[var(--pm-text-tertiary)]">
            Próximo follow-up: {formatDateTime(record.insight.followUpAt)}
          </div>
        </div>
      </PmPanel>

      <ProspectingPrepSheet
        open={showPrep}
        businessName={record.business.name}
        insight={record.insight}
        priority={record.business.priority}
        statusLabel={status.label}
        onClose={() => setShowPrep(false)}
      />
    </>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-[var(--pm-text-tertiary)]">Sin señales adicionales.</p> : null}
      {items.map((item) => (
        <p key={item} className="pm-card-soft px-3 py-2 text-sm text-[var(--pm-text-secondary)]">
          {item}
        </p>
      ))}
    </div>
  );
}

function InfoBlock({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pm-card-soft p-3">
      <p className="pm-caption uppercase tracking-[0.14em]">{title}</p>
      <p className="mt-1 text-sm font-medium text-[var(--pm-text)]">{body}</p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function MessageBlock({ title, content }: { title: string; content: string }) {
  return (
    <article className="pm-card-soft p-3">
      <p className="pm-caption uppercase tracking-[0.14em]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--pm-text-secondary)]">{content}</p>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="pm-card-soft p-3">
      <p className="pm-caption uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-sm text-[var(--pm-text)]">{value}</p>
    </div>
  );
}
