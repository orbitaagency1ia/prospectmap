"use client";

import { useState, type ReactNode } from "react";
import { Copy, X } from "lucide-react";

import type { PriorityLevel } from "@/lib/constants";
import type { ProspectInsight } from "@/lib/prospect-intelligence";

import { PmBadge } from "../ui/pm";

type Props = {
  open: boolean;
  businessName: string;
  insight: ProspectInsight | null;
  priority?: PriorityLevel | null;
  statusLabel?: string;
  onClose: () => void;
};

export function ProspectingPrepSheet({
  open,
  businessName,
  insight,
  priority,
  statusLabel,
  onClose,
}: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!open || !insight) {
    return null;
  }

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[650] bg-[rgba(7,8,12,0.78)] p-3 backdrop-blur-md" onClick={onClose}>
      <div
        className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-[var(--pm-border)] bg-[linear-gradient(180deg,rgba(24,28,35,0.98),rgba(10,11,15,0.99))] shadow-[var(--pm-shadow-float)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--pm-border)] px-5 py-4">
          <div>
            <p className="pm-kicker">Preparar prospección</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--pm-text)]">{businessName}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Chip label={`Prioridad ${insight.score}`} tone="cyan" />
              <Chip label={insight.tierLabel} tone="emerald" />
              <Chip label={insight.service.shortLabel} tone="slate" />
              <Chip label={insight.effectiveVerticalLabel} tone="slate" />
              {statusLabel ? <Chip label={statusLabel} tone="amber" /> : null}
              {priority ? <Chip label={`Prioridad ${priority}`} tone="amber" /> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pm-btn pm-btn-secondary"
          >
            <span className="inline-flex items-center gap-2">
              <X className="h-4 w-4" />
              Cerrar
            </span>
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <Card title="Resumen ejecutivo">
              <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{insight.executiveSummary}</p>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Ángulo comercial recomendado">
                <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{insight.commercialAngle}</p>
              </Card>
              <Card title="CTA sugerida">
                <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{insight.ctaSuggestion}</p>
              </Card>
            </div>

            <Card title="Qué revisar antes de contactar">
              <Checklist items={insight.reviewChecklist} emptyText="No hay checklist adicional." />
            </Card>

            <Card title="Qué no decir">
              <Checklist items={insight.avoidTalkingPoints} emptyText="No hay alertas adicionales." />
            </Card>

            <Card title="Objeciones y respuestas">
              <div className="space-y-3">
                {insight.objections.map((item) => (
                  <article key={item.objection} className="pm-card-soft p-3">
                    <p className="text-sm font-medium text-[var(--pm-text)]">{item.objection}</p>
                    <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{item.response}</p>
                  </article>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Mensaje inicial">
              <CopyBlock
                copied={copied === "initial"}
                onCopy={() => copy("initial", insight.messages.initial)}
                content={insight.messages.initial}
              />
            </Card>
            <Card title="Follow-up 1">
              <CopyBlock
                copied={copied === "followup1"}
                onCopy={() => copy("followup1", insight.messages.followUp1)}
                content={insight.messages.followUp1}
              />
            </Card>
            <Card title="Follow-up 2">
              <CopyBlock
                copied={copied === "followup2"}
                onCopy={() => copy("followup2", insight.messages.followUp2)}
                content={insight.messages.followUp2}
              />
            </Card>
            <Card title="Riesgos y datos faltantes">
              <Checklist items={[...insight.riskSignals, ...insight.missingData]} emptyText="Sin riesgos fuertes detectados." />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pm-card">
      <p className="pm-caption uppercase tracking-[0.14em]">{title}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function CopyBlock({
  content,
  copied,
  onCopy,
}: {
  content: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">{content}</p>
      <button
        type="button"
        onClick={onCopy}
        className="pm-btn pm-btn-secondary"
      >
        <Copy className="h-4 w-4" />
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function Checklist({ items, emptyText }: { items: string[]; emptyText: string }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-[var(--pm-text-tertiary)]">{emptyText}</p> : null}
      {items.map((item) => (
        <p key={item} className="text-sm text-[var(--pm-text-secondary)]">
          • {item}
        </p>
      ))}
    </div>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "cyan" | "emerald" | "amber" | "slate";
}) {
  return (
    <PmBadge tone={tone === "slate" ? "neutral" : tone}>{label}</PmBadge>
  );
}
