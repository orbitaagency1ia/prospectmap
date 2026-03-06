"use client";

import { useState, type ReactNode } from "react";
import { Copy, X } from "lucide-react";

import type { PriorityLevel } from "@/lib/constants";
import type { ProspectInsight } from "@/lib/prospect-intelligence";
import { cn } from "@/lib/utils";

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
    <div className="fixed inset-0 z-[650] bg-slate-950/75 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-700 bg-slate-950 shadow-[0_28px_90px_rgba(2,6,23,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Preparar prospeccion</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">{businessName}</h2>
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
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200"
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
              <p className="text-sm leading-6 text-slate-300">{insight.executiveSummary}</p>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card title="Angulo comercial recomendado">
                <p className="text-sm leading-6 text-slate-300">{insight.commercialAngle}</p>
              </Card>
              <Card title="CTA sugerida">
                <p className="text-sm leading-6 text-slate-300">{insight.ctaSuggestion}</p>
              </Card>
            </div>

            <Card title="Que revisar antes de contactar">
              <Checklist items={insight.reviewChecklist} emptyText="No hay checklist adicional." />
            </Card>

            <Card title="Que no decir">
              <Checklist items={insight.avoidTalkingPoints} emptyText="No hay alertas adicionales." />
            </Card>

            <Card title="Objeciones y respuestas">
              <div className="space-y-3">
                {insight.objections.map((item) => (
                  <article key={item.objection} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                    <p className="text-sm font-medium text-slate-100">{item.objection}</p>
                    <p className="mt-1 text-sm text-slate-300">{item.response}</p>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
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
      <p className="text-sm leading-6 text-slate-300">{content}</p>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
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
      {items.length === 0 ? <p className="text-sm text-slate-500">{emptyText}</p> : null}
      {items.map((item) => (
        <p key={item} className="text-sm text-slate-300">
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
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        tone === "emerald"
          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
          : tone === "amber"
            ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
            : tone === "slate"
              ? "border-slate-700 bg-slate-900 text-slate-200"
              : "border-cyan-500/60 bg-cyan-500/15 text-cyan-200",
      )}
    >
      {label}
    </span>
  );
}
