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
  const badgeToneMap = {
    emerald: "emerald",
    amber: "amber",
    violet: "violet",
    cyan: "cyan",
    slate: "neutral",
    neutral: "neutral",
  } as const;

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
      <PmPanel elevated className="pm-texture-soft space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="pm-kicker">Lead en foco</p>
            <h2 className="pm-title mt-3 text-[1.5rem] leading-tight sm:text-[1.78rem]">{record.business.name}</h2>
            <p className="pm-muted mt-2 text-sm leading-6">
              {record.insight.sectorLabel} · {record.insight.cityLabel} · {record.insight.effectiveVerticalLabel}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", status.badgeClass)}>{status.label}</span>
              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", opportunity.badgeClass)}>
                {record.insight.tierLabel}
              </span>
              <PmBadge tone="cyan">Prioridad comercial {record.insight.score}</PmBadge>
              <PmBadge>{record.insight.service.fitLabel}</PmBadge>
            </div>
          </div>

          <div className="pm-focus-pane flex w-full flex-col gap-2 px-4 py-4 sm:w-auto sm:min-w-[240px]">
            <button type="button" onClick={() => setShowPrep(true)} className="pm-btn pm-btn-primary w-full">
              Preparar prospección
            </button>
            <button type="button" onClick={() => handleCopy("initial", record.insight.messages.initial)} className="pm-btn pm-btn-secondary w-full">
              <Copy className="h-4 w-4" />
              {copied === "initial" ? "Mensaje copiado" : "Copiar mensaje"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoPill label="Valor estimado" value={formatCurrency(record.insight.estimatedValue)} />
          <InfoPill label="Valor ponderado" value={formatCurrency(record.insight.weightedValue)} />
          <InfoPill label="Atención" value={record.insight.attentionLabel} />
          <InfoPill label="Último toque" value={formatDaysSince(record.insight.daysSinceTouch)} />
        </div>

        {showDemoBadges && record.insight.demoBadges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {record.insight.demoBadges.map((badge) => (
              <PmBadge key={badge.label} tone={badgeToneMap[badge.tone] ?? "neutral"}>
                {badge.label}
              </PmBadge>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <InfoBlock title="Por qué atacarlo" body={record.insight.attackSummary} highlight>
            <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{record.insight.executiveSummary}</p>
          </InfoBlock>
          <InfoBlock title="Qué hacer ahora" body={record.insight.nextAction.action}>
            <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">
              {record.insight.nextAction.channel} · {record.insight.nextAction.reason}
            </p>
            <p className="mt-2 text-xs text-[var(--pm-text-tertiary)]">
              Urgencia: {record.insight.nextAction.urgency} · Probabilidad de cierre: {Math.round(record.insight.closeProbability * 100)}%
            </p>
          </InfoBlock>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <InfoBlock title="Servicio recomendado" body={record.insight.service.label}>
            <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{record.insight.service.reason}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--pm-text-secondary)]">
              {record.insight.service.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </InfoBlock>

          <InfoBlock title="Ángulo comercial" body={record.insight.commercialAngle}>
            <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{record.insight.ctaSuggestion}</p>
          </InfoBlock>
        </div>

        <div className="pm-card p-4 sm:p-5">
          <p className="pm-kicker">Mensajes</p>
          <div className="mt-4 grid gap-3">
            <MessageBlock title="Mensaje inicial" content={record.insight.messages.initial} />
            <MessageBlock title="Follow-up 1" content={record.insight.messages.followUp1} />
            <MessageBlock title="Follow-up 2" content={record.insight.messages.followUp2} />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="pm-card p-4 sm:p-5">
            <p className="pm-kicker">Qué revisar</p>
            <div className="mt-4 space-y-2">
              {record.insight.reviewChecklist.length === 0 ? <p className="text-sm text-[var(--pm-text-tertiary)]">Sin checklist adicional.</p> : null}
              {record.insight.reviewChecklist.map((item) => (
                <p key={item} className="text-sm leading-6 text-[var(--pm-text-secondary)]">
                  • {item}
                </p>
              ))}
            </div>
            <div className="pm-section-divider mt-4 pt-4">
              <p className="pm-caption uppercase tracking-[0.16em] text-[var(--pm-text-tertiary)]">Qué no decir</p>
              <div className="mt-3 space-y-2">
                {record.insight.avoidTalkingPoints.map((item) => (
                  <p key={item} className="text-sm leading-6 text-[var(--pm-text-secondary)]">
                    • {item}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="pm-card p-4 sm:p-5">
            <p className="pm-kicker">Objeciones</p>
            <div className="mt-4 space-y-3">
              {record.insight.objections.map((item) => (
                <div key={item.objection} className="pm-list-row rounded-[1rem] px-3.5 py-3.5">
                  <p className="text-sm font-medium text-[var(--pm-text)]">{item.objection}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--pm-text-secondary)]">{item.response}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="pm-card p-4 sm:p-5">
            <p className="pm-kicker">Señales a favor</p>
            <Checklist items={record.insight.fitSignals} emptyText="Sin señales adicionales." />
          </section>
          <section className="pm-card p-4 sm:p-5">
            <p className="pm-kicker">Riesgos o huecos</p>
            <Checklist items={[...record.insight.riskSignals, ...record.insight.missingData]} emptyText="No hay alertas relevantes." />
          </section>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="pm-list-row rounded-[1rem] px-3.5 py-3 text-xs text-[var(--pm-text-tertiary)]">
            Última interacción: {formatDateTime(record.business.lastInteractionAt)}
          </div>
          <div className="pm-list-row rounded-[1rem] px-3.5 py-3 text-xs text-[var(--pm-text-tertiary)]">
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

function Checklist({ items, emptyText }: { items: string[]; emptyText: string }) {
  return (
    <div className="mt-4 space-y-2">
      {items.length === 0 ? <p className="text-sm text-[var(--pm-text-tertiary)]">{emptyText}</p> : null}
      {items.map((item) => (
        <p key={item} className="text-sm leading-6 text-[var(--pm-text-secondary)]">
          • {item}
        </p>
      ))}
    </div>
  );
}

function InfoBlock({
  title,
  body,
  children,
  highlight = false,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={cn(
        "pm-card p-4 sm:p-5",
        highlight && "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(18,22,28,0.82))_padding-box]",
      )}
    >
      <p className="pm-kicker">{title}</p>
      <p className="mt-4 text-sm font-medium leading-7 text-[var(--pm-text)]">{body}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MessageBlock({ title, content }: { title: string; content: string }) {
  return (
    <article className="pm-list-row rounded-[1rem] px-3.5 py-3.5">
      <p className="pm-caption uppercase tracking-[0.16em]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--pm-text-secondary)]">{content}</p>
    </article>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="pm-list-row rounded-[1rem] px-3.5 py-3.5">
      <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--pm-text)]">{value}</p>
    </div>
  );
}
