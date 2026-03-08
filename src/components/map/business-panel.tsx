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
  const demoBadgeToneMap = {
    emerald: "emerald",
    amber: "amber",
    violet: "violet",
    cyan: "cyan",
    slate: "neutral",
    neutral: "neutral",
  } as const;

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
      <aside className="pm-side-panel flex h-full items-center justify-center p-6">
        <PmEmpty
          title="Selecciona una cuenta"
          body="Abre un negocio del mapa para ver su briefing comercial, decidir el ángulo y registrar actividad sin salir del territorio."
        />
      </aside>
    );
  }

  return (
    <aside className="pm-side-panel flex h-full min-h-0 flex-col">
      <header className="pm-fade-mask border-b border-[var(--pm-border)] px-4 py-5 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="pm-kicker">Informe comercial</p>
            <h2 className="pm-title mt-2 text-[1.28rem] leading-tight">{panelTitle}</h2>
            <p className="pm-muted mt-2 text-sm">{selected.category ?? "Sin categoría"} · {selected.city || "Ubicación sin confirmar"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pm-btn pm-btn-secondary min-h-0 rounded-[1rem] px-3 py-2 text-xs"
            aria-label="Cerrar ficha"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {headerStatus}
          {insight ? <PmBadge tone="cyan">Prioridad comercial {insight.score}</PmBadge> : null}
          {insight ? <PmBadge>{insight.service.shortLabel}</PmBadge> : null}
          {insight ? <PmBadge>{insight.effectiveVerticalLabel}</PmBadge> : null}
        </div>

        {insight ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <MetaBadge label="Valor estimado" value={insight.estimatedValueLabel} />
            <MetaBadge label="Urgencia" value={insight.nextAction.urgency} />
            <MetaBadge label="Qué hacer ahora" value={insight.nextAction.action} />
          </div>
        ) : null}

        {selected.mode === "overpass" ? (
          <div className="mt-4 rounded-[1.35rem] border border-[rgba(239,139,53,0.16)] bg-[linear-gradient(180deg,rgba(239,139,53,0.08),rgba(19,23,30,0.82))] p-4">
            <p className="text-sm leading-6 text-[var(--pm-text)]">
              Detectado en OpenStreetMap. Guárdalo para convertirlo en una cuenta operativa con estado, prioridad y notas privadas.
            </p>
            <button
              type="button"
              disabled={busy}
              className="pm-btn pm-btn-primary mt-3"
              onClick={() => onSaveOverpass(selected)}
            >
              <Save className="h-4 w-4" />
              {busy ? "Guardando..." : "Guardar negocio"}
            </button>
          </div>
        ) : null}

        {insight ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-[var(--pm-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] px-4 py-4 shadow-[var(--pm-shadow-card)]">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                    OPPORTUNITY_META[insight.tier].badgeClass,
                  )}
                >
                  {insight.tierLabel}
                </span>
                {insight.marketVertical !== insight.effectiveVertical ? (
                  <PmBadge>Mercado detectado: {insight.marketVerticalLabel}</PmBadge>
                ) : null}
                {showDemoBadges && insight.demoBadges.length > 0
                  ? insight.demoBadges.map((badge) => (
                      <PmBadge key={badge.label} tone={demoBadgeToneMap[badge.tone] ?? "neutral"}>
                        {badge.label}
                      </PmBadge>
                    ))
                  : null}
              </div>
              <p className="mt-4 text-sm leading-7 text-[var(--pm-text)]">{insight.executiveSummary}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <QuickActionButton onClick={() => setShowPrep(true)} icon={Sparkles} label="Preparar prospección" tone="cyan" />
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

            <div className="pm-tabs">
              <TabButton active={activeTab === "informe"} onClick={() => setActiveTab("informe")} label="Informe" />
              <TabButton active={activeTab === "datos"} onClick={() => setActiveTab("datos")} label="Datos" />
              {isSaved ? <TabButton active={activeTab === "notas"} onClick={() => setActiveTab("notas")} label="Notas" /> : null}
            </div>
          </div>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        {activeTab === "informe" && insight ? (
          <section className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <InsightBlock title="Por qué atacarlo" highlight>
                <p className="text-sm font-medium leading-6 text-[var(--pm-text)]">{insight.attackSummary}</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <MetaBadge label="Encaje" value={insight.fitSummary} />
                  <MetaBadge label="Riesgo principal" value={insight.riskSummary} />
                  <MetaBadge label="Ángulo" value={insight.commercialAngle} />
                  <MetaBadge label="CTA sugerida" value={insight.ctaSuggestion} />
                </div>
              </InsightBlock>

              <InsightBlock title="Qué hacer ahora">
                <p className="text-sm font-medium text-[var(--pm-text)]">{insight.nextAction.action}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--pm-text-secondary)]">
                  {insight.nextAction.channel} · {insight.nextAction.reason}
                </p>
                <div className="mt-4 grid gap-2">
                  <MetaBadge label="Dolor principal" value={insight.painPoint} />
                  <MetaBadge label="Atención" value={insight.attentionLabel} />
                </div>
              </InsightBlock>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <InsightBlock title="Servicio recomendado">
                <p className="text-sm font-medium text-[var(--pm-text)]">{insight.service.label}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--pm-text-secondary)]">{insight.service.reason}</p>
                <div className="mt-4 space-y-2">
                  {insight.service.reasons.map((reason) => (
                    <p key={reason} className="text-sm text-[var(--pm-text-secondary)]">
                      • {reason}
                    </p>
                  ))}
                </div>
              </InsightBlock>

              <InsightBlock title="Qué revisar antes de contactar">
                <div className="space-y-2">
                  {insight.reviewChecklist.map((item) => (
                    <p key={item} className="text-sm text-[var(--pm-text-secondary)]">
                      • {item}
                    </p>
                  ))}
                </div>
                <div className="pm-section-divider mt-4 pt-4">
                  <p className="pm-caption uppercase tracking-[0.16em]">Qué no decir</p>
                  <div className="mt-2 space-y-2">
                    {insight.avoidTalkingPoints.map((item) => (
                      <p key={item} className="text-sm text-[var(--pm-text-secondary)]">
                        • {item}
                      </p>
                    ))}
                  </div>
                </div>
              </InsightBlock>
            </div>

            <div className="pm-card p-4 sm:p-5">
              <p className="pm-kicker">Mensajes sugeridos</p>
              <div className="mt-4 grid gap-3">
                <MessageBlock label="Mensaje inicial" content={insight.messages.initial} />
                <MessageBlock label="Follow-up 1" content={insight.messages.followUp1} />
                <MessageBlock label="Follow-up 2" content={insight.messages.followUp2} />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <InsightBlock title="Objeciones probables">
                <div className="space-y-3">
                  {insight.objections.map((item) => (
                    <div key={item.objection} className="pm-card-soft p-3.5">
                      <p className="text-sm font-medium text-[var(--pm-text)]">{item.objection}</p>
                      <p className="mt-2 text-sm leading-6 text-[var(--pm-text-secondary)]">{item.response}</p>
                    </div>
                  ))}
                </div>
              </InsightBlock>

              <InsightBlock title="Qué lo hace prioritario">
                <ListPanel items={insight.fitSignals} emptyText="Sin señales fuertes todavía." />
                <div className="pm-section-divider mt-4 pt-4">
                  <p className="pm-caption uppercase tracking-[0.16em]">Riesgos o huecos</p>
                  <div className="mt-3">
                    <ListPanel items={[...insight.riskSignals, ...insight.missingData]} emptyText="No hay alertas importantes." />
                  </div>
                </div>
              </InsightBlock>
            </div>

            <div className="pm-card p-4 sm:p-5">
              <p className="pm-kicker">Lógica del score</p>
              <div className="mt-4 space-y-2.5">
                {insight.breakdown.map((item) => (
                  <div key={item.key} className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--pm-text)]">{item.label}</p>
                      <p
                        className={cn(
                          "font-mono text-xs",
                          item.direction === "minus" ? "text-rose-300" : "text-[var(--pm-primary)]",
                        )}
                      >
                        {item.direction === "minus" ? "-" : "+"}
                        {item.value.toFixed(1)} / {item.max}
                      </p>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--pm-text-tertiary)]">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "datos" ? (
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="pm-card p-4 sm:p-5">
              <p className="pm-kicker">Operativa</p>
              <div className="mt-4 space-y-4">
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
              </div>
            </div>

            <div className="pm-card p-4 sm:p-5">
              <p className="pm-kicker">Empresa y ubicación</p>
              <div className="mt-4 space-y-4">
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
              </div>
            </div>

            <div className="pm-card p-4 sm:p-5">
              <p className="pm-kicker">Decisor y seguimiento</p>
              <div className="mt-4 space-y-4">
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                </div>
              </div>
            </div>

            {isSaved ? (
              <button type="submit" disabled={busy} className="pm-btn pm-btn-primary w-full">
                {busy ? "Guardando..." : "Guardar cambios"}
              </button>
            ) : null}
          </form>
        ) : null}

        {activeTab === "notas" && isSaved ? (
          <section className="space-y-4">
            <div className="pm-card p-4 sm:p-5">
              <p className="pm-kicker">Actividad rápida</p>
              <div className="mt-4 space-y-3">
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={4}
                  className="field resize-y"
                  placeholder="Qué ha pasado, qué respondió, siguiente paso y cualquier detalle útil para la próxima interacción."
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  disabled={savingNote || !noteText.trim()}
                  className="pm-btn pm-btn-primary w-full"
                >
                  {savingNote ? "Guardando nota..." : "Añadir nota"}
                </button>
              </div>
            </div>

            <div className="pm-card p-4 sm:p-5">
              <p className="pm-kicker">Timeline</p>
              <div className="mt-4 space-y-3">
                {notesLoading ? <p className="text-xs text-[var(--pm-text-tertiary)]">Cargando notas...</p> : null}
                {!notesLoading && notes.length === 0 ? (
                  <PmEmpty body="Todavía no hay interacción registrada para esta cuenta." />
                ) : null}
                {notes.map((note) => (
                  <article key={note.id} className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--pm-text-tertiary)]">{formatDateTime(note.created_at)}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--pm-text)]">{note.note_text}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {panelStatus?.isNonViable ? (
        <div className="border-t border-[var(--pm-border)] bg-[rgba(213,107,119,0.08)] px-4 py-3 text-xs text-[rgba(255,230,234,0.98)] sm:px-5">
          Cuenta marcada como no viable. Se recomienda sacarla de campañas activas y del foco diario.
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
  highlight = false,
}: {
  title: string;
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={cn(
        "pm-card p-4 sm:p-5",
        highlight && "border-[rgba(239,139,53,0.12)] bg-[linear-gradient(180deg,rgba(239,139,53,0.06),rgba(18,22,28,0.82))_padding-box]",
      )}
    >
      <p className="pm-kicker">{title}</p>
      <div className="mt-4">{children}</div>
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
    <article className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3.5">
      <p className="pm-caption font-medium uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--pm-text)]">{content}</p>
    </article>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] px-3.5 py-3">
      <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--pm-text)]">{value}</p>
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
    <label className="block space-y-1.5">
      <span className="pm-caption font-medium uppercase tracking-[0.16em]">{label}</span>
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
        "pm-tab",
        active
          ? "pm-tab-active"
          : "",
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
        "pm-btn min-h-[46px] justify-start rounded-[1rem] px-3.5 py-3 text-xs",
        tone === "cyan"
          ? "pm-btn-primary"
          : tone === "amber"
            ? "border-[rgba(217,173,89,0.16)] bg-[linear-gradient(180deg,rgba(217,173,89,0.1),rgba(18,22,28,0.82))] text-[rgba(255,243,214,0.98)]"
            : tone === "violet"
              ? "border-[rgba(143,130,239,0.16)] bg-[linear-gradient(180deg,rgba(143,130,239,0.1),rgba(18,22,28,0.82))] text-[rgba(239,236,255,0.98)]"
              : tone === "rose"
                ? "border-[rgba(213,107,119,0.16)] bg-[linear-gradient(180deg,rgba(213,107,119,0.1),rgba(18,22,28,0.82))] text-[rgba(255,230,234,0.98)]"
                : "pm-btn-secondary",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ListPanel({ items, emptyText }: { items: string[]; emptyText: string }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-[var(--pm-text-tertiary)]">{emptyText}</p> : null}
      {items.map((item) => (
        <p key={item} className="text-sm leading-6 text-[var(--pm-text-secondary)]">
          • {item}
        </p>
      ))}
    </div>
  );
}
