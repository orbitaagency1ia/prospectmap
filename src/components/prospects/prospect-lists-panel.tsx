"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { FolderPlus, Layers3, Plus, Target } from "lucide-react";

import type { ProspectRecord } from "@/lib/prospect-intelligence";
import { cn, formatCurrency } from "@/lib/utils";

import { PmBadge, PmEmpty, PmNotice, PmPanel } from "../ui/pm";

import { useProspectLists } from "./use-prospect-lists";

type Props = {
  userId: string;
  records: ProspectRecord[];
  title?: string;
  description?: string;
  defaultName?: string;
};

type ListStatus = "borrador" | "activa" | "en_curso" | "completada" | "archivada";

const LIST_STATUS_LABELS: Record<ListStatus, string> = {
  borrador: "Borrador",
  activa: "Activa",
  en_curso: "En curso",
  completada: "Completada",
  archivada: "Archivada",
};

export function ProspectListsPanel({
  userId,
  records,
  title = "Listas operativas",
  description = "Guarda selecciones de prospectos y conviértelas en campañas accionables.",
  defaultName = "Nueva lista",
}: Props) {
  const { lists, items, loading, error, tableAvailable, createList, addBusinessesToList, updateList } =
    useProspectLists(userId);

  const [draftName, setDraftName] = useState(defaultName);
  const [draftFocus, setDraftFocus] = useState("Ataque comercial");
  const [draftStatus, setDraftStatus] = useState<ListStatus>("activa");
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const savedRecords = useMemo(
    () => records.filter((record) => record.business.mode === "saved" && record.business.business),
    [records],
  );
  const selectedBusinessIds = useMemo(
    () =>
      savedRecords
        .map((record) => record.business.business?.id ?? null)
        .filter((value): value is string => Boolean(value)),
    [savedRecords],
  );
  const itemMap = useMemo(() => {
    const map = new Map<string, string[]>();

    items.forEach((item) => {
      map.set(item.list_id, [...(map.get(item.list_id) ?? []), item.business_id]);
    });

    return map;
  }, [items]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftName.trim()) {
      setInfo("Pon un nombre a la lista.");
      return;
    }

    setBusy(true);
    const topRecord = savedRecords[0];
    const result = await createList({
      name: draftName.trim(),
      focus: draftFocus.trim() || "Ataque comercial",
      status: draftStatus,
      serviceFocus: topRecord?.insight.service.service ?? null,
      cityFilter: topRecord?.insight.cityLabel ?? null,
      sectorFilter: topRecord?.insight.sectorLabel ?? null,
      businessIds: selectedBusinessIds,
    });
    setBusy(false);

    if (!result.ok) {
      setInfo(result.error);
      return;
    }

    setInfo(`Lista guardada con ${selectedBusinessIds.length} prospectos.`);
    setDraftName(defaultName);
    setDraftFocus("Ataque comercial");
  };

  return (
    <PmPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="pm-kicker">Campañas</p>
          <h2 className="pm-title mt-2 text-xl">{title}</h2>
          <p className="pm-muted mt-1 text-sm">{description}</p>
        </div>
        <div className="pm-card-soft text-right">
          <p className="pm-caption uppercase tracking-[0.16em]">Selección</p>
          <p className="mt-1 text-lg font-semibold text-[var(--pm-text)]">{selectedBusinessIds.length}</p>
        </div>
      </div>

      {!tableAvailable ? (
        <PmNotice tone="amber" className="mt-4">
          Las campañas todavía no están disponibles en esta instalación. Puedes seguir trabajando con el resto del flujo comercial mientras se termina la activación.
        </PmNotice>
      ) : null}

      <form className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1fr_0.8fr_auto]" onSubmit={handleCreate}>
        <input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          className="field"
          placeholder="Ej. Clínicas alta oportunidad"
        />
        <input
          value={draftFocus}
          onChange={(event) => setDraftFocus(event.target.value)}
          className="field"
          placeholder="Enfoque comercial"
        />
        <select
          value={draftStatus}
          onChange={(event) => setDraftStatus(event.target.value as ListStatus)}
          className="field"
        >
          {Object.entries(LIST_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy || selectedBusinessIds.length === 0 || !tableAvailable}
          className="pm-btn pm-btn-primary"
        >
          <FolderPlus className="h-4 w-4" />
          Guardar selección
        </button>
      </form>

      {info ? <p className="mt-3 text-sm text-[var(--pm-text-secondary)]">{info}</p> : null}
      {error ? <PmNotice tone="rose" className="mt-3">{error}</PmNotice> : null}

      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="pm-card-soft px-4 py-4 text-sm text-[var(--pm-text-secondary)]">
            Cargando campañas guardadas...
          </p>
        ) : null}

        {!loading && lists.length === 0 ? (
          <PmEmpty body="Crea tu primera lista con la selección actual y úsala como campaña operativa reutilizable." />
        ) : null}

        {lists.map((list) => {
          const businessIds = itemMap.get(list.id) ?? [];
          const linkedRecords = savedRecords.filter((record) => {
            const businessId = record.business.business?.id;
            return businessId ? businessIds.includes(businessId) : false;
          });
          const touchedCount = linkedRecords.filter((record) => record.business.status !== "sin_contactar").length;
          const progress = linkedRecords.length === 0 ? 0 : Math.round((touchedCount / linkedRecords.length) * 100);
          const value = linkedRecords.reduce((sum, record) => sum + record.insight.estimatedValue, 0);
          const weightedValue = linkedRecords.reduce((sum, record) => sum + record.insight.weightedValue, 0);
          const urgent = linkedRecords.filter((record) => record.insight.followUpDue || record.insight.coolingDown).length;
          const topService = linkedRecords[0]?.insight.service.shortLabel ?? "Sin señal";

          return (
            <article
              key={list.id}
              className="pm-card"
            >
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--pm-text)]">{list.name}</h3>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-1 text-[11px] font-medium",
                        list.status === "completada"
                          ? "border-[rgba(78,192,134,0.32)] bg-[rgba(78,192,134,0.12)] text-[rgba(223,255,238,0.98)]"
                          : list.status === "archivada"
                            ? "border-[var(--pm-border)] bg-[rgba(255,255,255,0.03)] text-[var(--pm-text-secondary)]"
                            : "border-[rgba(239,139,53,0.28)] bg-[rgba(239,139,53,0.1)] text-[var(--pm-text)]",
                      )}
                    >
                      {LIST_STATUS_LABELS[list.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{list.focus || "Sin foco definido"}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--pm-text-secondary)]">
                    <PmBadge className="items-center gap-1 px-2 py-1">
                      <Target className="h-3.5 w-3.5" />
                      {linkedRecords.length} leads
                    </PmBadge>
                    <PmBadge className="items-center gap-1 px-2 py-1">
                      <Layers3 className="h-3.5 w-3.5" />
                      {topService}
                    </PmBadge>
                    <PmBadge className="px-2 py-1">
                      {urgent} con urgencia
                    </PmBadge>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[360px]">
                  <Metric value={`${progress}%`} label="Progreso" />
                  <Metric value={formatCurrency(value)} label="Valor bruto" />
                  <Metric value={formatCurrency(weightedValue)} label="Valor ponderado" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/attack?source=list&listId=${list.id}`} className="pm-btn pm-btn-primary">
                  Trabajar campaña
                </Link>
                <button
                  type="button"
                  disabled={selectedBusinessIds.length === 0}
                  onClick={async () => {
                    setBusy(true);
                    const result = await addBusinessesToList(list.id, selectedBusinessIds);
                    setBusy(false);
                    setInfo(result.ok ? "Selección añadida a la lista." : result.error ?? "No pude actualizar la lista.");
                  }}
                  className="pm-btn pm-btn-secondary"
                >
                  <Plus className="h-4 w-4" />
                  Añadir selección
                </button>
                <select
                  value={list.status}
                  onChange={async (event) => {
                    const result = await updateList(list.id, { status: event.target.value as ListStatus });
                    setInfo(result.ok ? "Estado de campaña actualizado." : result.error ?? "No pude actualizar el estado.");
                  }}
                  className="field max-w-[180px]"
                >
                  {Object.entries(LIST_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          );
        })}
      </div>
    </PmPanel>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="pm-card-soft px-3 py-3">
      <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[var(--pm-text)]">{value}</p>
    </div>
  );
}
