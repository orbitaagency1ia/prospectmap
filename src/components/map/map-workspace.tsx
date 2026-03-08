"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Loader2, Radar, ScanSearch, Upload } from "lucide-react";

import {
  OVERPASS_FETCH_DEBOUNCE_MS,
  PRIORITY_OPTIONS,
  PROSPECT_STATUS_ORDER,
  STATUS_META,
  type PriorityLevel,
  type ProspectStatus,
} from "@/lib/constants";
import { buildCategoryOptions, mergeBusinesses, type BusinessFilters, DEFAULT_FILTERS } from "@/lib/business-helpers";
import {
  buildConquestSnapshot,
  buildProspectRecords,
  filterByBounds,
  sortProspectRecordsByScore,
  VERTICAL_CONFIGS,
  type ProspectRecord,
  type VerticalId,
} from "@/lib/prospect-intelligence";
import { createClient } from "@/lib/supabase/client";
import {
  buildPriorityChangeText,
  buildStatusChangeText,
  logBusinessEvent,
  parseFollowUpIso,
} from "@/lib/commercial/business-events";
import type { BusinessEventRow, BusinessRow, CombinedBusiness, NoteRow, OverpassResponse, ProfileRow } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { ConquestPanel } from "../prospects/intelligence-panels";
import { PmBadge, PmEmpty, PmNotice } from "../ui/pm";
import { ProspectDetailPanel } from "../prospects/prospect-detail-panel";
import { ProspectCard } from "../prospects/prospect-ui";

import { BusinessPanel } from "./business-panel";
import { CsvImportDialog } from "./csv-import-dialog";
import type { MapBounds } from "./map-canvas";

const MapCanvas = dynamic(() => import("./map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,rgba(24,21,18,0.94),rgba(12,10,9,0.98))] text-sm text-[var(--pm-text-secondary)]">
      Cargando mapa...
    </div>
  ),
});

type Props = {
  profile: ProfileRow;
};

type InfoMessage = {
  type: "success" | "error";
  text: string;
};

export function MapWorkspace({ profile }: Props) {
  const supabase = createClient();
  const { settings, ready, saveState, setVertical } = useCommercialConfig(profile.id);
  const { profile: accountProfile, ready: profileReady } = useAccountCommercialProfile(profile.id);

  const [savedBusinesses, setSavedBusinesses] = useState<BusinessRow[]>([]);
  const [overpassBusinesses, setOverpassBusinesses] = useState<OverpassResponse["businesses"]>([]);
  const [latestNotes, setLatestNotes] = useState<Map<string, { text: string; createdAt: string }>>(new Map());

  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [filters, setFilters] = useState<BusinessFilters>(DEFAULT_FILTERS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [selectedNotes, setSelectedNotes] = useState<NoteRow[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<BusinessEventRow[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingOverpass, setLoadingOverpass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showSweepMode, setShowSweepMode] = useState(false);
  const [showConquestMode, setShowConquestMode] = useState(false);
  const [sweepSelectedKey, setSweepSelectedKey] = useState<string | null>(null);

  const [message, setMessage] = useState<InfoMessage | null>(null);

  const showMessage = (info: InfoMessage) => {
    setMessage(info);
    window.setTimeout(() => {
      setMessage(null);
    }, 3500);
  };

  const loadSavedBusinesses = useCallback(async () => {
    setLoadingSaved(true);

    const [businessesResponse, notesResponse] = await Promise.all([
      supabase.from("businesses").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("business_notes")
        .select("business_id,note_text,created_at")
        .order("created_at", { ascending: false })
        .limit(600),
    ]);

    if (!businessesResponse.error && businessesResponse.data) {
      setSavedBusinesses(businessesResponse.data);
    }

    if (!notesResponse.error && notesResponse.data) {
      const notesMap = new Map<string, { text: string; createdAt: string }>();

      notesResponse.data.forEach((note) => {
        if (!notesMap.has(note.business_id)) {
          notesMap.set(note.business_id, {
            text: note.note_text,
            createdAt: note.created_at,
          });
        }
      });

      setLatestNotes(notesMap);
    }

    setLoadingSaved(false);
  }, [supabase]);

  useEffect(() => {
    loadSavedBusinesses().catch(() => {
      showMessage({ type: "error", text: "No pude cargar negocios guardados." });
      setLoadingSaved(false);
    });
  }, [loadSavedBusinesses]);

  useEffect(() => {
    if (!mapBounds) {
      return;
    }

    const handle = window.setTimeout(async () => {
      setLoadingOverpass(true);

      try {
        const bbox = `${mapBounds.south},${mapBounds.west},${mapBounds.north},${mapBounds.east}`;
        const response = await fetch(`/api/overpass?bbox=${encodeURIComponent(bbox)}`);
        const payload = (await response.json()) as OverpassResponse & { error?: string };

        setOverpassBusinesses(payload.businesses ?? []);

        if (payload.error) {
          showMessage({
            type: "error",
            text: "Overpass no respondió en este intento. Usa zoom o vuelve a mover el mapa.",
          });
        }
      } catch {
        showMessage({ type: "error", text: "Error cargando negocios desde Overpass." });
      } finally {
        setLoadingOverpass(false);
      }
    }, OVERPASS_FETCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [mapBounds]);

  const combinedBusinesses = useMemo(
    () =>
      mergeBusinesses({
        savedBusinesses,
        overpassBusinesses,
        latestNotes,
      }),
    [savedBusinesses, overpassBusinesses, latestNotes],
  );

  const categoryOptions = useMemo(() => buildCategoryOptions(combinedBusinesses), [combinedBusinesses]);

  const prospectRecords = useMemo(
    () => buildProspectRecords(combinedBusinesses, settings, accountProfile, profile.city_name),
    [accountProfile, combinedBusinesses, profile.city_name, settings],
  );

  const filteredRecords = useMemo(
    () =>
      prospectRecords.filter((record) => {
        if (filters.category !== "all") {
          if ((record.business.category ?? "").trim() !== filters.category) {
            return false;
          }
        }

        if (filters.status !== "all" && record.business.status !== filters.status) {
          return false;
        }

        if (filters.priority !== "all") {
          if (!record.business.priority || record.business.priority !== filters.priority) {
            return false;
          }
        }

        return true;
      }),
    [filters, prospectRecords],
  );

  const selectedRecord = useMemo(
    () => prospectRecords.find((record) => record.business.key === selectedKey) ?? null,
    [prospectRecords, selectedKey],
  );

  const selectedBusiness = selectedRecord?.business ?? null;
  const selectedInsight = selectedRecord?.insight ?? null;

  const mapMarkers = useMemo(
    () =>
      filteredRecords.map((record) => ({
        key: record.business.key,
        lat: record.business.lat,
        lng: record.business.lng,
        name: record.business.name,
        category: record.business.category,
        score: record.insight.score,
        opportunityLabel: record.insight.tierLabel,
        serviceLabel: record.insight.service.shortLabel,
        urgency: record.insight.nextAction.urgency,
        nextAction: record.insight.nextAction.action,
        estimatedValue: record.insight.estimatedValue,
        attentionLabel: record.insight.attentionLabel,
        status: record.business.status,
        worked: record.business.worked,
        lastInteractionAt: record.business.lastInteractionAt,
        latestNote: record.business.latestNote,
      })),
    [filteredRecords],
  );

  const sweepRecords = useMemo(() => {
    if (!mapBounds) {
      return [];
    }

    return sortProspectRecordsByScore(filteredRecords.filter((record) => filterByBounds(record, mapBounds))).slice(0, 20);
  }, [filteredRecords, mapBounds]);
  const conquestSnapshot = useMemo(
    () =>
      buildConquestSnapshot(mapBounds ? filteredRecords.filter((record) => filterByBounds(record, mapBounds)) : filteredRecords, {
        scopeLabel: mapBounds ? "Zona visible" : profile.city_name,
        bounds: mapBounds,
      }),
    [filteredRecords, mapBounds, profile.city_name],
  );
  const attackZoneHref = useMemo(() => {
    const params = new URLSearchParams({
      source: "territory",
      territoryOnly: "1",
      territoryLabel: mapBounds ? "Zona visible" : profile.city_name,
    });

    if (mapBounds) {
      params.set("south", String(mapBounds.south));
      params.set("west", String(mapBounds.west));
      params.set("north", String(mapBounds.north));
      params.set("east", String(mapBounds.east));
    }

    return `/attack?${params.toString()}`;
  }, [mapBounds, profile.city_name]);

  const selectedSweepRecord = useMemo(
    () => sweepRecords.find((record) => record.business.key === sweepSelectedKey) ?? sweepRecords[0] ?? null,
    [sweepRecords, sweepSelectedKey],
  );

  useEffect(() => {
    if (showSweepMode && !sweepSelectedKey && sweepRecords[0]) {
      setSweepSelectedKey(sweepRecords[0].business.key);
    }
  }, [showSweepMode, sweepRecords, sweepSelectedKey]);

  useEffect(() => {
    if (!selectedBusiness || selectedBusiness.mode !== "saved" || !selectedBusiness.business) {
      setSelectedNotes([]);
      setSelectedEvents([]);
      return;
    }

    const businessId = selectedBusiness.business.id;

    const loadNotes = async () => {
      setLoadingNotes(true);
      setLoadingEvents(true);
      const [notesResponse, eventsResponse] = await Promise.all([
        supabase
          .from("business_notes")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false }),
        supabase
          .from("business_events")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(120),
      ]);

      if (!notesResponse.error && notesResponse.data) {
        setSelectedNotes(notesResponse.data);
      }

      if (!eventsResponse.error && eventsResponse.data) {
        setSelectedEvents(eventsResponse.data);
      } else {
        setSelectedEvents([]);
      }

      setLoadingNotes(false);
      setLoadingEvents(false);
    };

    loadNotes().catch(() => {
      setLoadingNotes(false);
      setLoadingEvents(false);
    });
  }, [selectedBusiness, supabase]);

  const handleSaveOverpass = async (business: CombinedBusiness) => {
    if (business.mode !== "overpass" || !business.overpass) {
      return;
    }

    setBusy(true);

    const payload = {
      user_id: profile.id,
      source: "overpass" as const,
      external_source_id: business.overpass.externalSourceId,
      name: business.overpass.name,
      address: business.overpass.address,
      city: business.overpass.city ?? profile.city_name,
      category: business.overpass.category,
      phone: business.overpass.phone,
      email: business.overpass.email,
      website: business.overpass.website,
      opening_hours: business.overpass.opening_hours,
      lat: business.overpass.lat,
      lng: business.overpass.lng,
      prospect_status: "sin_contactar" as ProspectStatus,
      priority: "media" as PriorityLevel,
    };

    const { data, error } = await supabase.from("businesses").insert(payload).select("*").single();

    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase
          .from("businesses")
          .select("*")
          .eq("external_source_id", business.overpass.externalSourceId)
          .maybeSingle();

        if (existing) {
          setSelectedKey(`saved:${existing.id}`);
          await loadSavedBusinesses();
          showMessage({ type: "success", text: "Negocio ya estaba guardado. Se abrió su ficha." });
        }
      } else {
        showMessage({ type: "error", text: "No pude guardar este negocio ahora mismo. Vuelve a intentarlo en unos segundos." });
      }

      setBusy(false);
      return;
    }

    await loadSavedBusinesses();
    setSelectedKey(`saved:${data.id}`);
    await logBusinessEvent(supabase, {
      userId: profile.id,
      businessId: data.id,
      type: "business_saved",
      details: "Guardado desde Territorio.",
      metadata: {
        source: "overpass",
        external_source_id: business.overpass.externalSourceId,
      },
    });
    showMessage({ type: "success", text: "Negocio guardado correctamente." });
    setBusy(false);
  };

  const handleUpdateBusiness = async (
    businessId: string,
    payload: {
      name?: string;
      address?: string;
      city?: string;
      category?: string;
      vertical_override?: VerticalId | "";
      phone?: string;
      email?: string;
      website?: string;
      opening_hours?: string;
      owner_name?: string;
      owner_role?: string;
      direct_phone?: string;
      direct_email?: string;
      contact_notes?: string;
      prospect_status?: ProspectStatus;
      priority?: PriorityLevel;
      last_contact_at?: string;
      next_follow_up_at?: string;
    },
  ) => {
    const toNullable = (value?: string) => (value && value.trim() ? value.trim() : null);
    const previous = savedBusinesses.find((entry) => entry.id === businessId) ?? null;

    setBusy(true);

    const { error } = await supabase
      .from("businesses")
      .update({
        name: payload.name?.trim(),
        address: toNullable(payload.address),
        city: toNullable(payload.city),
        category: toNullable(payload.category),
        vertical_override: payload.vertical_override || null,
        phone: toNullable(payload.phone),
        email: toNullable(payload.email),
        website: toNullable(payload.website),
        opening_hours: toNullable(payload.opening_hours),
        owner_name: toNullable(payload.owner_name),
        owner_role: toNullable(payload.owner_role),
        direct_phone: toNullable(payload.direct_phone),
        direct_email: toNullable(payload.direct_email),
        contact_notes: toNullable(payload.contact_notes),
        prospect_status: payload.prospect_status,
        priority: payload.priority,
        last_contact_at: payload.last_contact_at ? new Date(payload.last_contact_at).toISOString() : null,
        next_follow_up_at: payload.next_follow_up_at ? new Date(payload.next_follow_up_at).toISOString() : null,
      })
      .eq("id", businessId);

    if (error) {
      showMessage({ type: "error", text: "No pude actualizar la ficha en este momento. Reinténtalo." });
      setBusy(false);
      return;
    }

    if (previous) {
      const nextStatus = payload.prospect_status ?? previous.prospect_status;
      const nextPriority = payload.priority ?? previous.priority;
      const nextFollowUp = parseFollowUpIso(payload.next_follow_up_at) ?? previous.next_follow_up_at;

      if (previous.prospect_status !== nextStatus) {
        await logBusinessEvent(supabase, {
          userId: profile.id,
          businessId,
          type: "status_changed",
          details: buildStatusChangeText(previous.prospect_status, nextStatus),
          metadata: {
            previous_status: previous.prospect_status,
            next_status: nextStatus,
          },
        });
      }

      if (previous.priority !== nextPriority) {
        await logBusinessEvent(supabase, {
          userId: profile.id,
          businessId,
          type: "priority_changed",
          details: buildPriorityChangeText(previous.priority, nextPriority),
          metadata: {
            previous_priority: previous.priority,
            next_priority: nextPriority,
          },
        });
      }

      if (previous.next_follow_up_at !== nextFollowUp && nextFollowUp) {
        await logBusinessEvent(supabase, {
          userId: profile.id,
          businessId,
          type: "follow_up_scheduled",
          details: "Seguimiento actualizado.",
          metadata: {
            previous_follow_up_at: previous.next_follow_up_at,
            next_follow_up_at: nextFollowUp,
          },
        });
      }

      const hasGenericFieldChanges =
        (payload.name && payload.name.trim() !== previous.name) ||
        (payload.address !== undefined && toNullable(payload.address) !== previous.address) ||
        (payload.city !== undefined && toNullable(payload.city) !== previous.city) ||
        (payload.category !== undefined && toNullable(payload.category) !== previous.category) ||
        (payload.phone !== undefined && toNullable(payload.phone) !== previous.phone) ||
        (payload.email !== undefined && toNullable(payload.email) !== previous.email) ||
        (payload.website !== undefined && toNullable(payload.website) !== previous.website) ||
        (payload.owner_name !== undefined && toNullable(payload.owner_name) !== previous.owner_name) ||
        (payload.owner_role !== undefined && toNullable(payload.owner_role) !== previous.owner_role) ||
        (payload.contact_notes !== undefined && toNullable(payload.contact_notes) !== previous.contact_notes);

      if (hasGenericFieldChanges) {
        await logBusinessEvent(supabase, {
          userId: profile.id,
          businessId,
          type: "business_updated",
          details: "Datos de la ficha actualizados.",
        });
      }
    }

    await loadSavedBusinesses();
    showMessage({ type: "success", text: "Cambios guardados." });
    setBusy(false);
  };

  const handleAddNote = async (businessId: string, note: string) => {
    setSavingNote(true);

    const { error } = await supabase.from("business_notes").insert({
      business_id: businessId,
      user_id: profile.id,
      note_text: note,
    });

    if (error) {
      showMessage({ type: "error", text: "No pude guardar la nota en este momento. Reinténtalo." });
      setSavingNote(false);
      return;
    }

    await logBusinessEvent(supabase, {
      userId: profile.id,
      businessId,
      type: "note_added",
      details: note.trim().slice(0, 180),
    });

    await loadSavedBusinesses();
    const [notesResponse, eventsResponse] = await Promise.all([
      supabase
        .from("business_notes")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
      supabase
        .from("business_events")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    setSelectedNotes(notesResponse.data ?? []);
    setSelectedEvents(eventsResponse.data ?? []);
    showMessage({ type: "success", text: "Nota añadida." });
    setSavingNote(false);
  };

  return (
    <>
      <div className="grid min-h-[620px] flex-1 overflow-hidden rounded-[2rem] border border-[var(--pm-border)] bg-[linear-gradient(180deg,rgba(16,14,12,0.97),rgba(9,8,8,0.99))] shadow-[var(--pm-shadow-float)] lg:h-[68dvh] lg:min-h-[620px] lg:max-h-[780px] lg:grid-cols-[360px_minmax(0,1fr)] xl:h-[70dvh] xl:grid-cols-[360px_minmax(0,1fr)_468px] lg:rounded-[2.35rem]">
        <aside className="hidden min-h-0 border-r border-[var(--pm-border)] bg-[rgba(14,12,11,0.76)] lg:flex lg:flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pm-animate-left pm-stagger">
            <div className="pm-focus-pane p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="pm-kicker">Territorio</p>
                  <h1 className="pm-title mt-2 text-[1.3rem]">Explora y decide</h1>
                  <p className="pm-muted mt-2 text-sm leading-6">
                    Mapa vivo para detectar qué merece barrido, ataque o seguimiento.
                  </p>
                </div>
                <SummaryTag total={prospectRecords.length} filtered={filteredRecords.length} />
              </div>

              <div className="pm-map-chip-row mt-4">
                <PmBadge>{profile.city_name}</PmBadge>
                <PmBadge>{mapBounds ? "Zona visible" : "Ciudad completa"}</PmBadge>
                <PmBadge>{conquestSnapshot.openCount} abiertas</PmBadge>
              </div>
            </div>

            <div className="pm-control-surface p-4">
              <p className="pm-kicker">Filtros</p>
              <div className="mt-4">
                <FiltersRow
                  filters={filters}
                  categories={categoryOptions}
                  onChange={setFilters}
                  onReset={() => setFilters(DEFAULT_FILTERS)}
                  stacked
                />
              </div>
              <div className="pm-stage-divider mt-4 pt-4">
                <CommercialContextInline
                  ready={ready && profileReady}
                  vertical={settings.vertical}
                  saveState={saveState}
                  onVerticalChange={setVertical}
                  mobile
                />
              </div>
            </div>

            <div className="pm-control-surface p-4">
              <p className="pm-kicker">Acciones</p>
              <div className="mt-4 space-y-2">
                <Link href={attackZoneHref} className="pm-btn pm-btn-primary w-full">
                  Atacar zona
                </Link>
                <button type="button" onClick={() => setShowSweepMode(true)} className="pm-btn pm-btn-secondary w-full justify-start">
                  <ScanSearch className="h-4 w-4" />
                  Barrido
                </button>
                <button type="button" onClick={() => setShowConquestMode(true)} className="pm-btn pm-btn-secondary w-full justify-start">
                  <Radar className="h-4 w-4" />
                  Conquista
                </button>
                <button type="button" onClick={() => setShowCsvImport(true)} className="pm-btn pm-btn-secondary w-full justify-start">
                  <Upload className="h-4 w-4" />
                  Importar CSV
                </button>
              </div>
            </div>

            <div className="pm-control-surface p-4">
              <p className="pm-kicker">Lectura</p>
              <div className="mt-4 grid gap-2">
                <InlineStat label="Ámbito" value={mapBounds ? "Zona visible" : profile.city_name} />
                <InlineStat label="Vertical" value={VERTICAL_CONFIGS[settings.vertical].shortLabel} />
                <InlineStat label="Oportunidad" value={`${conquestSnapshot.openCount} activas`} />
              </div>
            </div>

            {conquestSnapshot.totalCount > 0 ? (
              <div className="pm-control-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="pm-kicker">Conquista</p>
                    <h3 className="pm-title mt-1 text-base">{conquestSnapshot.scopeLabel}</h3>
                    <p className="pm-muted mt-1 text-sm">
                      {conquestSnapshot.coveragePercent}% trabajado · {conquestSnapshot.openCount} vivas
                    </p>
                  </div>
                  <button type="button" className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs" onClick={() => setShowConquestMode(true)}>
                    Ver
                  </button>
                </div>

                <div className="mt-4 grid gap-2">
                  <div className="pm-list-row rounded-[1rem] px-3.5 py-3">
                    <p className="pm-caption uppercase tracking-[0.16em]">Zona caliente</p>
                    <p className="mt-1 text-sm text-[var(--pm-text)]">{conquestSnapshot.hotZones[0]?.label ?? "Sin señal dominante"}</p>
                  </div>
                  <div className="pm-list-row rounded-[1rem] px-3.5 py-3">
                    <p className="pm-caption uppercase tracking-[0.16em]">Pendiente</p>
                    <p className="mt-1 text-sm text-[var(--pm-text)]">{conquestSnapshot.untouchedCount} negocios sin tocar</p>
                  </div>
                </div>
              </div>
            ) : null}

            {message ? (
              <PmNotice tone={message.type === "success" ? "emerald" : "rose"} className="text-xs">
                {message.text}
              </PmNotice>
            ) : null}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden pm-animate-rise">
          <div className="hidden items-center justify-between gap-4 border-b border-[var(--pm-border)] px-4 py-4 lg:flex">
            <div>
              <p className="pm-kicker">Mapa</p>
              <p className="pm-muted mt-2 text-sm">
                {profile.city_name} · {mapBounds ? "Zona visible" : "Ciudad completa"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(loadingSaved || loadingOverpass) ? (
                <span className="pm-map-status">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {loadingSaved ? "Cargando guardados" : "Cargando reales"}
                </span>
              ) : null}
              <PmBadge>{VERTICAL_CONFIGS[settings.vertical].shortLabel}</PmBadge>
              <PmBadge>{conquestSnapshot.openCount} oportunidades</PmBadge>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-[var(--pm-border)] p-3 lg:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="pm-kicker">Territorio</p>
                <h1 className="pm-title mt-1 text-[1.05rem]">Explora y decide</h1>
                <p className="pm-muted mt-1 text-xs">{profile.city_name}</p>
              </div>
              <SummaryTag total={prospectRecords.length} filtered={filteredRecords.length} compact />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                className="pm-btn pm-btn-secondary min-h-0 flex-1 px-3 py-2 text-xs"
                onClick={() => setShowMobileFilters((value) => !value)}
              >
                <Filter className="h-4 w-4" />
                Refinar
              </button>
              <Link href={attackZoneHref} className="pm-btn pm-btn-primary min-h-0 px-3 py-2 text-xs">
                Ataque
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowSweepMode(true)} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
                <ScanSearch className="h-4 w-4" />
                Barrido
              </button>
              <button type="button" onClick={() => setShowConquestMode(true)} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
                <Radar className="h-4 w-4" />
                Conquista
              </button>
              <button type="button" onClick={() => setShowCsvImport(true)} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
                <Upload className="h-4 w-4" />
                CSV
              </button>
            </div>

            {showMobileFilters ? (
              <div className="pm-control-surface p-3">
                <FiltersRow
                  filters={filters}
                  categories={categoryOptions}
                  onChange={setFilters}
                  onReset={() => setFilters(DEFAULT_FILTERS)}
                  stacked
                />
                <div className="pm-section-divider mt-3 pt-3">
                  <CommercialContextInline
                    ready={ready && profileReady}
                    vertical={settings.vertical}
                    saveState={saveState}
                    onVerticalChange={setVertical}
                    mobile
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <PmBadge className="text-[11px]">{ready ? VERTICAL_CONFIGS[settings.vertical].shortLabel : "Preparando vertical"}</PmBadge>
              <PmBadge className="text-[11px]">{mapBounds ? "Zona visible" : "Ciudad"}</PmBadge>
              {(loadingSaved || loadingOverpass) ? (
                <span className="pm-map-status text-[11px]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {loadingSaved ? "Guardados" : "Reales"}
                </span>
              ) : null}
            </div>

            {message ? (
              <PmNotice tone={message.type === "success" ? "emerald" : "rose"} className="text-xs">
                {message.text}
              </PmNotice>
            ) : null}
          </div>

          <div className="px-3 pb-3 pt-0 lg:flex-1 lg:px-4 lg:pb-4">
            <div className="pm-map-stage h-[50vh] min-h-[340px] overflow-hidden rounded-[1.2rem] lg:h-full lg:min-h-0">
              <MapCanvas
                center={[profile.city_lat ?? 40.4168, profile.city_lng ?? -3.7038]}
                markers={mapMarkers}
                selectedKey={selectedKey}
                onMarkerSelect={(key) => {
                  setSelectedKey(key);
                  setShowMobilePanel(true);
                }}
                onBoundsChange={setMapBounds}
              />
            </div>
          </div>
        </section>

        <aside className="hidden min-h-0 border-l border-[var(--pm-border)] bg-[rgba(16,14,12,0.28)] xl:block pm-animate-right">
          <BusinessPanel
            key={selectedRecord?.business.key ?? "none-desktop"}
            selected={selectedBusiness}
            insight={selectedInsight}
            showDemoBadges
            notes={selectedNotes}
            notesLoading={loadingNotes}
            events={selectedEvents}
            eventsLoading={loadingEvents}
            busy={busy}
            savingNote={savingNote}
            onClose={() => setSelectedKey(null)}
            onSaveOverpass={handleSaveOverpass}
            onUpdateBusiness={handleUpdateBusiness}
            onAddNote={handleAddNote}
          />
        </aside>
      </div>

      {showMobilePanel && selectedRecord ? (
        <div className="xl:hidden">
          <div className="pm-stage-divider mt-4 border-t pt-4">
            <div className="pm-panel overflow-hidden p-0">
              <BusinessPanel
                key={selectedRecord.business.key}
                selected={selectedBusiness}
                insight={selectedInsight}
                showDemoBadges
                notes={selectedNotes}
                notesLoading={loadingNotes}
                events={selectedEvents}
                eventsLoading={loadingEvents}
                busy={busy}
                savingNote={savingNote}
                onClose={() => setShowMobilePanel(false)}
                onSaveOverpass={handleSaveOverpass}
                onUpdateBusiness={handleUpdateBusiness}
                onAddNote={handleAddNote}
              />
            </div>
          </div>
        </div>
      ) : null}

      {showSweepMode ? (
        <SweepModeModal
          records={sweepRecords}
          selectedRecord={selectedSweepRecord}
          activeVerticalLabel={VERTICAL_CONFIGS[settings.vertical].label}
          showDemoBadges
          onClose={() => setShowSweepMode(false)}
          onSelect={(record) => setSweepSelectedKey(record.business.key)}
          onOpenBusiness={(record) => {
            setSelectedKey(record.business.key);
            setShowSweepMode(false);
            setShowMobilePanel(true);
          }}
        />
      ) : null}

      {showConquestMode ? (
        <ConquestModeModal
          snapshot={conquestSnapshot}
          onClose={() => setShowConquestMode(false)}
          onOpenBusiness={(businessKey) => {
            setSelectedKey(businessKey);
            setShowConquestMode(false);
            setShowMobilePanel(true);
          }}
        />
      ) : null}

      <CsvImportDialog
        open={showCsvImport}
        profile={profile}
        onClose={() => setShowCsvImport(false)}
        onImported={loadSavedBusinesses}
      />
    </>
  );
}

function ConquestModeModal({
  snapshot,
  onClose,
  onOpenBusiness,
}: {
  snapshot: ReturnType<typeof buildConquestSnapshot>;
  onClose: () => void;
  onOpenBusiness: (businessKey: string) => void;
}) {
  return (
    <div className="pm-sheet-backdrop pm-overlay-shell fixed inset-0 z-[520] p-3" onClick={onClose}>
      <div
        className="pm-shell pm-sheet-shell mx-auto flex h-full max-w-6xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--pm-border)] px-5 py-5">
          <div>
            <p className="pm-kicker">Modo conquista</p>
            <h2 className="pm-title mt-1 text-lg">Cobertura y potencial del territorio</h2>
            <p className="pm-muted mt-1 text-sm">{snapshot.scopeLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <ConquestPanel
            snapshot={snapshot}
            title="Dónde estás avanzando y dónde estás dejando dinero"
            description="Vista táctica del territorio visible para decidir qué zonas merecen barrido, seguimiento o ataque inmediato."
            onOpenBusiness={onOpenBusiness}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryTag({ total, filtered, compact = false }: { total: number; filtered: number; compact?: boolean }) {
  return (
    <div className={cn("pm-badge rounded-[1rem] px-3 py-2 text-xs", compact && "px-2.5 py-1.5 text-[11px]")}>
      <span>{filtered}</span>
      <span className="text-[var(--pm-text-tertiary)]">/</span>
      <span>{total}</span>
      {!compact ? <span className="text-[var(--pm-text-tertiary)]">{total === 1 ? "cuenta" : "cuentas"}</span> : null}
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.025)] px-3.5 py-3">
      <span className="text-xs uppercase tracking-[0.16em] text-[var(--pm-text-tertiary)]">{label}</span>
      <span className="text-sm font-medium text-[var(--pm-text)]">{value}</span>
    </div>
  );
}

function FiltersRow({
  filters,
  categories,
  onChange,
  onReset,
  stacked = false,
}: {
  filters: BusinessFilters;
  categories: string[];
  onChange: (filters: BusinessFilters) => void;
  onReset: () => void;
  stacked?: boolean;
}) {
  return (
    <div className={cn(stacked ? "grid gap-2.5" : "flex flex-wrap items-center gap-2.5")}>
      <select
        value={filters.category}
        onChange={(event) => onChange({ ...filters, category: event.target.value })}
        className={cn(
          "field min-h-0 w-full rounded-[1rem] px-3 py-2 text-xs",
          stacked ? "" : "sm:!w-[190px] xl:!w-[205px]",
        )}
      >
        <option value="all">Sector: todos</option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(event) =>
          onChange({
            ...filters,
            status: event.target.value as ProspectStatus | "all",
          })
        }
        className={cn(
          "field min-h-0 w-full rounded-[1rem] px-3 py-2 text-xs",
          stacked ? "" : "sm:!w-[190px] xl:!w-[205px]",
        )}
      >
        <option value="all">Estado: todos</option>
        {PROSPECT_STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>

      <select
        value={filters.priority}
        onChange={(event) =>
          onChange({
            ...filters,
            priority: event.target.value as PriorityLevel | "all",
          })
        }
        className={cn(
          "field min-h-0 w-full rounded-[1rem] px-3 py-2 text-xs",
          stacked ? "" : "sm:!w-[160px] xl:!w-[170px]",
        )}
      >
        <option value="all">Prioridad: todas</option>
        {PRIORITY_OPTIONS.map((priority) => (
          <option key={priority} value={priority}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onReset}
        className={cn("pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs", stacked && "w-full")}
      >
        Limpiar
      </button>
    </div>
  );
}

function SweepModeModal({
  records,
  selectedRecord,
  activeVerticalLabel,
  showDemoBadges,
  onClose,
  onSelect,
  onOpenBusiness,
}: {
  records: ProspectRecord[];
  selectedRecord: ProspectRecord | null;
  activeVerticalLabel: string;
  showDemoBadges: boolean;
  onClose: () => void;
  onSelect: (record: ProspectRecord) => void;
  onOpenBusiness: (record: ProspectRecord) => void;
}) {
  return (
    <div className="pm-sheet-backdrop pm-overlay-shell fixed inset-0 z-[520] p-3" onClick={onClose}>
      <div
        className="pm-shell pm-sheet-shell mx-auto flex h-full max-w-7xl flex-col overflow-hidden xl:grid xl:grid-cols-[1.2fr_0.8fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-0 flex-col border-b border-[var(--pm-border)] xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between border-b border-[var(--pm-border)] px-5 py-5">
            <div>
              <p className="pm-kicker">Barrido de zona</p>
              <h2 className="pm-title mt-1 text-lg">Mejores negocios de la zona visible</h2>
              <p className="pm-muted mt-1 text-sm">Vertical activa: {activeVerticalLabel}</p>
            </div>
            <button type="button" onClick={onClose} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
              Cerrar
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {records.length === 0 ? <PmEmpty body="No hay suficientes negocios visibles para generar barrido. Mueve el mapa o baja el zoom." /> : null}
            {records.map((record) => (
              <ProspectCard
                key={record.business.key}
                record={record}
                onSelect={onSelect}
                actionLabel="Ver detalle"
                showDemoBadges={showDemoBadges}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
          <ProspectDetailPanel
            record={selectedRecord}
            showDemoBadges={showDemoBadges}
            emptyText="Selecciona un negocio del barrido para ver servicio, acción y mensajes."
          />
          {selectedRecord ? (
            <button
              type="button"
              onClick={() => onOpenBusiness(selectedRecord)}
              className="pm-btn pm-btn-primary w-full"
            >
              Abrir ficha del negocio
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CommercialContextInline({
  ready,
  vertical,
  saveState,
  onVerticalChange,
  mobile = false,
}: {
  ready: boolean;
  vertical: VerticalId;
  saveState: "idle" | "saving" | "saved" | "local_only" | "error";
  onVerticalChange: (vertical: VerticalId) => void;
  mobile?: boolean;
}) {
  const saveLabel =
    saveState === "saving"
      ? "Guardando"
      : saveState === "saved"
        ? "Actualizado"
        : saveState === "local_only"
          ? "En este navegador"
          : saveState === "error"
            ? "Revisar"
            : "Listo";

  const tone = saveState === "error" ? "rose" : saveState === "local_only" ? "amber" : saveState === "saved" ? "emerald" : "neutral";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", mobile ? "w-full" : "")}>
      <select
        value={vertical}
        onChange={(event) => onVerticalChange(event.target.value as VerticalId)}
        disabled={!ready}
        className="field min-h-0 rounded-[1rem] px-3 py-2 text-xs disabled:opacity-60"
      >
        {Object.values(VERTICAL_CONFIGS).map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <PmBadge tone={tone} className="px-3 py-2 text-[11px]">
        {saveLabel}
      </PmBadge>
    </div>
  );
}
