"use client";

import { FormEvent, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { CircleSlash, Copy, Flag, Lock, Save, Sparkles, X } from "lucide-react";

import {
  PRIORITY_OPTIONS,
  PROSPECT_STATUS_ORDER,
  STATUS_META,
  type PriorityLevel,
  type ProspectStatus,
} from "@/lib/constants";
import { OPPORTUNITY_META, VERTICAL_CONFIGS, type ProspectInsight, type VerticalId } from "@/lib/prospect-intelligence";
import type { CombinedBusiness, NoteRow } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

import { PmBadge, PmEmpty } from "../ui/pm";

import { ProspectingPrepSheet } from "../prospects/prospecting-prep-sheet";

type EditableBusiness = {
  name: string;
  address: string;
  city: string;
  category: string;
  vertical_override: VerticalId | "";
  phone: string;
  email: string;
  website: string;
  opening_hours: string;
  owner_name: string;
  owner_role: string;
  direct_phone: string;
  direct_email: string;
  contact_notes: string;
  prospect_status: ProspectStatus;
  priority: PriorityLevel;
  last_contact_at: string;
  next_follow_up_at: string;
};

type Props = {
  selected: CombinedBusiness | null;
  insight: ProspectInsight | null;
  showDemoBadges?: boolean;
  notes: NoteRow[];
  notesLoading: boolean;
  busy: boolean;
  savingNote: boolean;
  onClose: () => void;
  onSaveOverpass: (business: CombinedBusiness) => Promise<void>;
  onUpdateBusiness: (businessId: string, payload: Partial<EditableBusiness>) => Promise<void>;
  onAddNote: (businessId: string, note: string) => Promise<void>;
};

const emptyForm: EditableBusiness = {
  name: "",
  address: "",
  city: "",
  category: "",
  vertical_override: "",
  phone: "",
  email: "",
  website: "",
  opening_hours: "",
  owner_name: "",
  owner_role: "",
  direct_phone: "",
  direct_email: "",
  contact_notes: "",
  prospect_status: "sin_contactar",
  priority: "media",
  last_contact_at: "",
  next_follow_up_at: "",
};

function valueToInput(value: string | null) {
  return value ?? "";
}

function buildFormState(selected: CombinedBusiness | null): EditableBusiness {
  if (!selected) {
    return emptyForm;
  }

  if (selected.mode === "saved" && selected.business) {
    const business = selected.business;
    return {
      name: valueToInput(business.name),
      address: valueToInput(business.address),
      city: valueToInput(business.city),
      category: valueToInput(business.category),
      vertical_override: business.vertical_override ?? "",
      phone: valueToInput(business.phone),
      email: valueToInput(business.email),
      website: valueToInput(business.website),
      opening_hours: valueToInput(business.opening_hours),
      owner_name: valueToInput(business.owner_name),
      owner_role: valueToInput(business.owner_role),
      direct_phone: valueToInput(business.direct_phone),
      direct_email: valueToInput(business.direct_email),
      contact_notes: valueToInput(business.contact_notes),
      prospect_status: business.prospect_status,
      priority: business.priority,
      last_contact_at: business.last_contact_at ? business.last_contact_at.slice(0, 16) : "",
      next_follow_up_at: business.next_follow_up_at ? business.next_follow_up_at.slice(0, 16) : "",
    };
  }

  return {
    ...emptyForm,
    name: selected.name,
    category: selected.category ?? "",
    vertical_override: "",
    address: selected.overpass?.address ?? "",
    city: selected.overpass?.city ?? "",
    phone: selected.overpass?.phone ?? "",
    email: selected.overpass?.email ?? "",
    website: selected.overpass?.website ?? "",
    opening_hours: selected.overpass?.opening_hours ?? "",
    prospect_status: "sin_contactar",
    priority: "media",
    next_follow_up_at: "",
  };
}

export function BusinessPanel({
  selected,
  insight,
  showDemoBadges = false,
  notes,
  notesLoading,
  busy,
  savingNote,
  onClose,
  onSaveOverpass,
  onUpdateBusiness,
  onAddNote,
}: Props) {
  const [formState, setFormState] = useState<EditableBusiness>(() => buildFormState(selected));
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"informe" | "datos" | "notas">("informe");
  const [showPrep, setShowPrep] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isSaved = selected?.mode === "saved" && selected.business;

  const panelTitle = selected?.name ?? "Negocio";
  const panelStatus = selected ? STATUS_META[selected.status] : null;

  const headerStatus = useMemo(() => {
    if (!selected) return null;

    const status = STATUS_META[selected.status];

    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs", status.badgeClass)}>
        {status.hasLockIcon ? <Lock className="h-3 w-3" /> : null}
        {status.label}
      </span>
    );
  }, [selected]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || selected.mode !== "saved" || !selected.business) return;

    const payload: Partial<EditableBusiness> = {
      ...formState,
      last_contact_at: formState.last_contact_at,
      next_follow_up_at: formState.next_follow_up_at,
    };

    await onUpdateBusiness(selected.business.id, payload);
  };

  const handleAddNote = async () => {
    if (!selected || selected.mode !== "saved" || !selected.business) return;
    if (!noteText.trim()) return;

    await onAddNote(selected.business.id, noteText.trim());
    setNoteText("");
  };

  const handleQuickUpdate = async (
    payload: Partial<EditableBusiness>,
    nextTab?: "informe" | "datos" | "notas",
  ) => {
    if (!selected || selected.mode !== "saved" || !selected.business) {
      return;
    }

    await onUpdateBusiness(selected.business.id, payload);

    if (nextTab) {
      setActiveTab(nextTab);
    }
  };

  const handleCopy = async (key: string, value?: string) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      setCopiedKey(null);
    }
  };

  if (!selected) {
    return (
      <aside className="flex h-full items-center justify-center border-l border-[rgba(30,51,80,0.72)] bg-[rgba(7,17,31,0.92)] p-6">
        <PmEmpty body="Selecciona un negocio para abrir su informe comercial, editar datos y registrar actividad." />
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col border-l border-[rgba(30,51,80,0.72)] bg-[rgba(7,17,31,0.96)]">
      <header className="flex items-start justify-between gap-3 border-b border-[rgba(30,51,80,0.72)] px-4 py-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--pm-text)]">{panelTitle}</h2>
          <p className="text-xs text-[var(--pm-text-secondary)]">{selected.category ?? "Sin categoría"}</p>
          <div className="flex items-center gap-2">{headerStatus}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="pm-btn pm-btn-secondary min-h-0 rounded-xl px-2.5 py-2 text-xs"
          aria-label="Cerrar ficha"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {selected.mode === "overpass" ? (
          <div className="space-y-3 rounded-[22px] border border-[rgba(58,190,249,0.35)] bg-[rgba(58,190,249,0.12)] p-4 text-sm">
            <p className="text-[var(--pm-text)]">Negocio detectado en OpenStreetMap. Aún no está guardado en tu cuenta.</p>
            <button
              type="button"
              disabled={busy}
              className="pm-btn pm-btn-primary"
              onClick={() => onSaveOverpass(selected)}
            >
              <Save className="h-4 w-4" />
              {busy ? "Guardando..." : "Guardar negocio"}
            </button>
          </div>
        ) : null}

        {insight ? (
          <section className="space-y-4 rounded-[24px] border border-[rgba(30,51,80,0.88)] bg-[rgba(13,23,40,0.88)] p-4 shadow-[0_18px_45px_rgba(2,6,23,0.24)]">
            <div className="flex flex-wrap items-center gap-2">
              <PmBadge tone="cyan">Prioridad comercial {insight.score}</PmBadge>
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                  OPPORTUNITY_META[insight.tier].badgeClass,
                )}
              >
                {insight.tierLabel}
              </span>
              <span className="pm-badge">{insight.service.label}</span>
              <span className="pm-badge">{insight.effectiveVerticalLabel}</span>
              {insight.marketVertical !== insight.effectiveVertical ? (
                <span className="pm-badge">
                  Mercado detectado: {insight.marketVerticalLabel}
                </span>
              ) : null}
            </div>

            <div className="pm-card-soft p-4">
              <p className="pm-kicker">Resumen ejecutivo</p>
              <p className="mt-2 text-sm leading-6 text-[var(--pm-text)]">{insight.executiveSummary}</p>
            </div>

            {showDemoBadges && insight.demoBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {insight.demoBadges.map((badge) => (
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
                              ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-200"
                              : "border-slate-600 bg-slate-700/50 text-slate-200",
                    )}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <QuickActionButton
                onClick={() => setShowPrep(true)}
                icon={Sparkles}
                label="Preparar prospección"
                tone="cyan"
              />
              <QuickActionButton
                onClick={() => handleCopy("initial", insight.messages.initial)}
                icon={Copy}
                label={copiedKey === "initial" ? "Mensaje copiado" : "Copiar mensaje inicial"}
              />
              {isSaved ? (
                <>
                  <QuickActionButton
                    onClick={() =>
                      handleQuickUpdate(
                        {
                          prospect_status: selected.status === "sin_contactar" ? "intento_contacto" : selected.status,
                          priority: "alta",
                          next_follow_up_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                        },
                        "notas",
                      )
                    }
                    icon={Flag}
                    label="Trabajar ahora"
                  />
                  <QuickActionButton
                    onClick={() =>
                      handleQuickUpdate(
                        {
                          prospect_status: "contactado",
                          last_contact_at: new Date().toISOString().slice(0, 16),
                        },
                        "notas",
                      )
                    }
                    icon={Flag}
                    label="Marcar llamada hecha"
                    tone="cyan"
                  />
                  <QuickActionButton
                    onClick={() =>
                      handleQuickUpdate(
                        {
                          next_follow_up_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                        },
                        "notas",
                      )
                    }
                    icon={Flag}
                    label="Programar follow-up"
                    tone="amber"
                  />
                  <QuickActionButton
                    onClick={() =>
                      handleQuickUpdate(
                        {
                          prospect_status:
                            selected.status === "sin_contactar" ? "intento_contacto" : selected.status,
                          priority: "alta",
                        },
                        "informe",
                      )
                    }
                    icon={Flag}
                    label="Mover a pipeline"
                    tone="violet"
                  />
                  <QuickActionButton
                    onClick={() => handleQuickUpdate({ prospect_status: "perdido" }, "informe")}
                    icon={CircleSlash}
                    label="Descartar"
                    tone="rose"
                  />
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <TabButton active={activeTab === "informe"} onClick={() => setActiveTab("informe")} label="Informe" />
              <TabButton active={activeTab === "datos"} onClick={() => setActiveTab("datos")} label="Datos" />
              {isSaved ? <TabButton active={activeTab === "notas"} onClick={() => setActiveTab("notas")} label="Notas" /> : null}
            </div>
          </section>
        ) : null}

        {activeTab === "informe" && insight ? (
          <section className="space-y-3">
            <InsightBlock title="Nivel de encaje y angulo">
              <p className="text-sm font-medium text-slate-100">{insight.fitSummary}</p>
              <p className="mt-1 text-sm text-slate-300">{insight.commercialAngle}</p>
              <p className="mt-2 text-xs text-slate-500">{insight.ctaSuggestion}</p>
            </InsightBlock>

            <InsightBlock title="Por qué atacarlo">
              <p className="text-sm font-medium text-slate-100">{insight.attackSummary}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <MetaBadge label="Valor estimado" value={insight.estimatedValueLabel} />
                <MetaBadge label="Riesgo dominante" value={insight.riskSummary} />
                <MetaBadge label="Qué hacer ahora" value={insight.nextAction.action} />
                <MetaBadge label="Atención" value={insight.attentionLabel} />
              </div>
            </InsightBlock>

            <InsightBlock title="Siguiente mejor accion">
              <p className="text-sm font-medium text-slate-100">{insight.nextAction.action}</p>
              <p className="mt-1 text-sm text-slate-300">
                {insight.nextAction.channel} · {insight.nextAction.reason}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Urgencia: {insight.nextAction.urgency} · Valor: {insight.estimatedValueLabel}
              </p>
            </InsightBlock>

            <InsightBlock title="Servicio Orbita recomendado">
              <p className="text-sm font-medium text-slate-100">{insight.service.label}</p>
              <p className="mt-1 text-sm text-slate-300">{insight.service.reason}</p>
              <div className="mt-2 space-y-1">
                {insight.service.reasons.map((reason) => (
                  <p key={reason} className="text-xs text-slate-500">
                    • {reason}
                  </p>
                ))}
              </div>
            </InsightBlock>

            <div className="grid gap-3">
              <ListInsightBlock title="Que lo hace prioritario" items={insight.fitSignals} />
              <ListInsightBlock title="Riesgos y objeciones" items={[...insight.riskSignals, ...insight.missingData]} />
              <ListInsightBlock title="Que revisar antes de contactar" items={insight.reviewChecklist} />
              <ListInsightBlock title="Que no decir" items={insight.avoidTalkingPoints} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mensajes sugeridos</p>
              <MessageBlock label="Mensaje inicial" content={insight.messages.initial} />
              <MessageBlock label="Follow-up 1" content={insight.messages.followUp1} />
              <MessageBlock label="Follow-up 2" content={insight.messages.followUp2} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Objeciones probables</p>
              {insight.objections.map((item) => (
                <div key={item.objection} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm font-medium text-slate-100">{item.objection}</p>
                  <p className="mt-1 text-sm text-slate-300">{item.response}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Logica del score</p>
              {insight.breakdown.map((item) => (
                <div key={item.key} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-200">{item.label}</p>
                    <p
                      className={cn(
                        "font-mono text-xs",
                        item.direction === "minus" ? "text-rose-300" : "text-cyan-200",
                      )}
                    >
                      {item.direction === "minus" ? "-" : "+"}
                      {item.value.toFixed(1)} / {item.max}
                    </p>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{item.reason}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "datos" ? (
          <form className="space-y-3" onSubmit={handleSave}>
          <Field label="Nombre">
            <input
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              className="field"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Estado">
              <select
                value={formState.prospect_status}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, prospect_status: event.target.value as ProspectStatus }))
                }
                className="field"
              >
                {PROSPECT_STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].hasLockIcon ? "🔒 " : ""}
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prioridad">
              <select
                value={formState.priority}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, priority: event.target.value as PriorityLevel }))
                }
                className="field"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Vertical del negocio">
            <select
              value={formState.vertical_override}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  vertical_override: event.target.value as VerticalId | "",
                }))
              }
              className="field"
            >
              <option value="">Usar vertical global</option>
              {Object.values(VERTICAL_CONFIGS).map((vertical) => (
                <option key={vertical.id} value={vertical.id}>
                  {vertical.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Dirección">
            <input
              value={formState.address}
              onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
              className="field"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Ciudad">
              <input
                value={formState.city}
                onChange={(event) => setFormState((prev) => ({ ...prev, city: event.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Sector">
              <input
                value={formState.category}
                onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}
                className="field"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Teléfono">
              <input
                value={formState.phone}
                onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                className="field"
              />
            </Field>
          </div>

          <Field label="Web">
            <input
              value={formState.website}
              onChange={(event) => setFormState((prev) => ({ ...prev, website: event.target.value }))}
              className="field"
              placeholder="https://"
            />
          </Field>

          <Field label="Horario">
            <input
              value={formState.opening_hours}
              onChange={(event) => setFormState((prev) => ({ ...prev, opening_hours: event.target.value }))}
              className="field"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre decisor">
              <input
                value={formState.owner_name}
                onChange={(event) => setFormState((prev) => ({ ...prev, owner_name: event.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Cargo decisor">
              <input
                value={formState.owner_role}
                onChange={(event) => setFormState((prev) => ({ ...prev, owner_role: event.target.value }))}
                className="field"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Teléfono directo">
              <input
                value={formState.direct_phone}
                onChange={(event) => setFormState((prev) => ({ ...prev, direct_phone: event.target.value }))}
                className="field"
              />
            </Field>

            <Field label="Email directo">
              <input
                value={formState.direct_email}
                onChange={(event) => setFormState((prev) => ({ ...prev, direct_email: event.target.value }))}
                className="field"
              />
            </Field>
          </div>

          <Field label="Notas de contacto">
            <textarea
              value={formState.contact_notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, contact_notes: event.target.value }))}
              rows={3}
              className="field resize-y"
            />
          </Field>

          <Field label="Último contacto">
            <input
              type="datetime-local"
              value={formState.last_contact_at}
              onChange={(event) => setFormState((prev) => ({ ...prev, last_contact_at: event.target.value }))}
              className="field"
            />
          </Field>

          <Field label="Próximo follow-up">
            <input
              type="datetime-local"
              value={formState.next_follow_up_at}
              onChange={(event) => setFormState((prev) => ({ ...prev, next_follow_up_at: event.target.value }))}
              className="field"
            />
          </Field>

          {isSaved ? (
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {busy ? "Guardando..." : "Guardar cambios"}
            </button>
          ) : null}
          </form>
        ) : null}

        {activeTab === "notas" && isSaved ? (
          <section className="space-y-3 border-t border-[rgba(30,51,80,0.72)] pt-4">
            <h3 className="text-sm font-semibold text-[var(--pm-text)]">Notas e interacciones</h3>

            <div className="space-y-2">
              <textarea
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
                rows={3}
                className="field resize-y"
                placeholder="Añade una nota de llamada, email o reunión..."
              />
              <button
                type="button"
                onClick={handleAddNote}
                disabled={savingNote || !noteText.trim()}
                className="pm-btn pm-btn-secondary w-full"
              >
                {savingNote ? "Guardando nota..." : "Añadir nota"}
              </button>
            </div>

            <div className="space-y-2">
              {notesLoading ? <p className="text-xs text-slate-400">Cargando notas...</p> : null}
              {!notesLoading && notes.length === 0 ? (
                <p className="pm-card-soft px-3 py-2 text-xs text-[var(--pm-text-secondary)]">
                  Todavía no hay notas para este negocio.
                </p>
              ) : null}
              {notes.map((note) => (
                <article key={note.id} className="pm-card-soft px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--pm-text-tertiary)]">{formatDateTime(note.created_at)}</p>
                  <p className="mt-1 text-sm text-[var(--pm-text)]">{note.note_text}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {panelStatus?.isNonViable ? (
        <div className="border-t border-[rgba(30,51,80,0.72)] px-4 py-2 text-xs text-rose-300">
          Estado no viable. Se recomienda excluir de campañas activas.
        </div>
      ) : null}

      <ProspectingPrepSheet
        open={showPrep}
        businessName={selected.name}
        insight={insight}
        priority={selected.priority}
        statusLabel={panelStatus?.label}
        onClose={() => setShowPrep(false)}
      />
    </aside>
  );
}

function InsightBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pm-card-soft p-3">
      <p className="pm-caption font-medium uppercase tracking-wide">{title}</p>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function MessageBlock({
  label,
  content,
}: {
  label: string;
  content: string;
}) {
  return (
    <article className="pm-card-soft p-3">
      <p className="pm-caption font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--pm-text)]">{content}</p>
    </article>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="pm-card-soft p-3">
      <p className="pm-caption uppercase tracking-[0.14em]">{label}</p>
      <p className="mt-1 text-sm text-[var(--pm-text)]">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="pm-caption font-medium uppercase tracking-wide">{label}</span>
      {children}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-3 py-2 text-xs font-medium transition",
        active
          ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100"
          : "border-[rgba(30,51,80,0.9)] bg-[rgba(7,17,31,0.72)] text-[var(--pm-text-secondary)] hover:border-[rgba(58,190,249,0.35)] hover:text-[var(--pm-text)]",
      )}
    >
      {label}
    </button>
  );
}

function QuickActionButton({
  onClick,
  icon: Icon,
  label,
  tone = "slate",
}: {
  onClick: () => void;
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone?: "cyan" | "amber" | "rose" | "violet" | "slate";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition",
        tone === "cyan"
          ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-100 hover:border-cyan-400"
          : tone === "amber"
            ? "border-amber-500/60 bg-amber-500/15 text-amber-100 hover:border-amber-400"
            : tone === "violet"
              ? "border-violet-500/60 bg-violet-500/15 text-violet-100 hover:border-violet-400"
            : tone === "rose"
              ? "border-rose-500/60 bg-rose-500/15 text-rose-100 hover:border-rose-400"
              : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ListInsightBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <InsightBlock title={title}>
      <div className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-[var(--pm-text-tertiary)]">Nada relevante todavía.</p> : null}
        {items.map((item) => (
          <p key={item} className="text-sm text-[var(--pm-text-secondary)]">
            • {item}
          </p>
        ))}
      </div>
    </InsightBlock>
  );
}
