"use client";

import { STATUS_META } from "@/lib/constants";
import { OPPORTUNITY_META, type ProspectRecord } from "@/lib/prospect-intelligence";
import { cn, formatDateTime } from "@/lib/utils";

type Props = {
  record: ProspectRecord | null;
  emptyText?: string;
};

export function ProspectDetailPanel({
  record,
  emptyText = "Selecciona un prospecto para ver acción, servicio y mensajes sugeridos.",
}: Props) {
  if (!record) {
    return (
      <aside className="rounded-xl border border-slate-800 bg-slate-900/65 p-4 text-sm text-slate-400">
        {emptyText}
      </aside>
    );
  }

  const status = STATUS_META[record.business.status];
  const opportunity = OPPORTUNITY_META[record.insight.tier];

  return (
    <aside className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/65 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Ficha comercial</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-100">{record.business.name}</h2>
        <p className="mt-1 text-sm text-slate-400">
          {record.insight.sectorLabel} · {record.insight.cityLabel}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", status.badgeClass)}>{status.label}</span>
        <span className={cn("inline-flex rounded-full px-2 py-1 text-xs font-medium", opportunity.badgeClass)}>
          {record.insight.tierLabel}
        </span>
        <span className="inline-flex rounded-full border border-cyan-700/70 bg-cyan-500/10 px-2 py-1 text-xs font-medium text-cyan-100">
          Score {record.insight.score}
        </span>
      </div>

      <InfoBlock title="Siguiente mejor accion" body={record.insight.nextAction.action}>
        <p className="text-sm text-slate-300">
          {record.insight.nextAction.channel} · {record.insight.nextAction.reason}
        </p>
      </InfoBlock>

      <InfoBlock title="Servicio Orbita recomendado" body={record.insight.service.label}>
        <p className="text-sm text-slate-300">{record.insight.service.reason}</p>
      </InfoBlock>

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Mensajes sugeridos</p>
        <MessageBlock title="Mensaje inicial" content={record.insight.messages.initial} />
        <MessageBlock title="Follow-up 1" content={record.insight.messages.followUp1} />
        <MessageBlock title="Follow-up 2" content={record.insight.messages.followUp2} />
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Logica del score</p>
        {record.insight.breakdown.map((item) => (
          <div key={item.key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-100">{item.label}</p>
              <p
                className={cn(
                  "font-mono text-sm",
                  item.direction === "minus" ? "text-rose-300" : "text-cyan-200",
                )}
              >
                {item.direction === "minus" ? "-" : "+"}
                {item.value.toFixed(1)} / {item.max}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.reason}</p>
          </div>
        ))}
      </section>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-500">
        Ultima interaccion: {formatDateTime(record.business.lastInteractionAt)}
      </div>
    </aside>
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
    <section className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{body}</p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function MessageBlock({ title, content }: { title: string; content: string }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-1 text-sm text-slate-200">{content}</p>
    </article>
  );
}
