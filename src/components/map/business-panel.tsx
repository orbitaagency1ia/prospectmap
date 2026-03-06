"use client";

import { FormEvent, useMemo, useState } from "react";
import { Lock, Save, X } from "lucide-react";

import {
  PRIORITY_OPTIONS,
  PROSPECT_STATUS_ORDER,
  STATUS_META,
  type PriorityLevel,
  type ProspectStatus,
} from "@/lib/constants";
import type { CombinedBusiness, NoteRow } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";

type EditableBusiness = {
  name: string;
  address: string;
  city: string;
  category: string;
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
};

type Props = {
  selected: CombinedBusiness | null;
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
    };
  }

  return {
    ...emptyForm,
    name: selected.name,
    category: selected.category ?? "",
    address: selected.overpass?.address ?? "",
    city: selected.overpass?.city ?? "",
    phone: selected.overpass?.phone ?? "",
    email: selected.overpass?.email ?? "",
    website: selected.overpass?.website ?? "",
    opening_hours: selected.overpass?.opening_hours ?? "",
    prospect_status: "sin_contactar",
    priority: "media",
  };
}

export function BusinessPanel({
  selected,
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
    };

    await onUpdateBusiness(selected.business.id, payload);
  };

  const handleAddNote = async () => {
    if (!selected || selected.mode !== "saved" || !selected.business) return;
    if (!noteText.trim()) return;

    await onAddNote(selected.business.id, noteText.trim());
    setNoteText("");
  };

  if (!selected) {
    return (
      <aside className="flex h-full items-center justify-center border-l border-slate-800 bg-slate-950/80 p-6 text-center text-sm text-slate-400">
        Selecciona un negocio en el mapa para abrir su ficha.
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col border-l border-slate-800 bg-slate-950/95">
      <header className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-100">{panelTitle}</h2>
          <p className="text-xs text-slate-400">{selected.category ?? "Sin categoría"}</p>
          <div className="flex items-center gap-2">{headerStatus}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-700 p-1.5 text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          aria-label="Cerrar ficha"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {selected.mode === "overpass" ? (
          <div className="space-y-3 rounded-xl border border-cyan-700/40 bg-cyan-900/15 p-3 text-sm">
            <p className="text-slate-200">Negocio detectado en OpenStreetMap. Aún no está guardado en tu cuenta.</p>
            <button
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => onSaveOverpass(selected)}
            >
              <Save className="h-4 w-4" />
              {busy ? "Guardando..." : "Guardar negocio"}
            </button>
          </div>
        ) : null}

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

        {isSaved ? (
          <section className="space-y-3 border-t border-slate-800 pt-4">
            <h3 className="text-sm font-semibold text-slate-200">Notas e interacciones</h3>

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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingNote ? "Guardando nota..." : "Añadir nota"}
              </button>
            </div>

            <div className="space-y-2">
              {notesLoading ? <p className="text-xs text-slate-400">Cargando notas...</p> : null}
              {!notesLoading && notes.length === 0 ? (
                <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
                  Todavía no hay notas para este negocio.
                </p>
              ) : null}
              {notes.map((note) => (
                <article key={note.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">{formatDateTime(note.created_at)}</p>
                  <p className="mt-1 text-sm text-slate-200">{note.note_text}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {panelStatus?.isNonViable ? (
        <div className="border-t border-slate-800 px-4 py-2 text-xs text-rose-300">
          Estado no viable. Se recomienda excluir de campañas activas.
        </div>
      ) : null}
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
