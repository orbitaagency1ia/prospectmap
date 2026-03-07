"use client";

import dynamic from "next/dynamic";
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
import type { BusinessRow, CombinedBusiness, NoteRow, OverpassResponse, ProfileRow } from "@/lib/types";
import { cn } from "@/lib/utils";

import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { ConquestPanel } from "../prospects/intelligence-panels";
import { PmEmpty } from "../ui/pm";
import { ProspectDetailPanel } from "../prospects/prospect-detail-panel";
import { ProspectCard } from "../prospects/prospect-ui";

import { BusinessPanel } from "./business-panel";
import { CsvImportDialog } from "./csv-import-dialog";
import type { MapBounds } from "./map-canvas";

const MapCanvas = dynamic(() => import("./map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-slate-300">
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
  const [loadingNotes, setLoadingNotes] = useState(false);

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
      return;
    }

    const businessId = selectedBusiness.business.id;

    const loadNotes = async () => {
      setLoadingNotes(true);
      const { data, error } = await supabase
        .from("business_notes")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSelectedNotes(data);
      }

      setLoadingNotes(false);
    };

    loadNotes().catch(() => {
      setLoadingNotes(false);
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

    await loadSavedBusinesses();
    const { data } = await supabase
      .from("business_notes")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    setSelectedNotes(data ?? []);
    showMessage({ type: "success", text: "Nota añadida." });
    setSavingNote(false);
  };

  return (
    <div className="relative flex h-[calc(100vh-140px)] min-h-[620px] flex-1 overflow-hidden rounded-none lg:h-[calc(100vh-112px)] lg:rounded-[32px] lg:border lg:border-[rgba(30,51,80,0.92)]">
      <div className="absolute left-3 right-3 top-3 z-[450]">
        <div className="hidden flex-wrap items-center gap-2 rounded-[24px] border border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.9)] p-2 shadow-lg backdrop-blur lg:flex">
          <FiltersRow
            filters={filters}
            categories={categoryOptions}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
          <CommercialContextInline
            ready={ready && profileReady}
            vertical={settings.vertical}
            saveState={saveState}
            onVerticalChange={setVertical}
          />
          <button
            type="button"
            onClick={() => setShowSweepMode(true)}
            className="pm-btn pm-btn-primary min-h-0 px-3 py-2 text-xs"
          >
            <ScanSearch className="h-4 w-4" />
            Barrido de zona
          </button>
          <button
            type="button"
            onClick={() => setShowConquestMode(true)}
            className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs"
          >
            <Radar className="h-4 w-4" />
            Modo conquista
          </button>
          <button
            type="button"
            onClick={() => setShowCsvImport(true)}
            className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </button>
          <SummaryTag total={prospectRecords.length} filtered={filteredRecords.length} />
        </div>

        <div className="flex items-center justify-between gap-2 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs"
              onClick={() => setShowMobileFilters((value) => !value)}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
            <span className="pm-badge text-[11px]">
              {ready ? VERTICAL_CONFIGS[settings.vertical].shortLabel : "Cargando..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSweepMode(true)}
              className="pm-btn pm-btn-primary min-h-0 px-3 py-2 text-xs"
            >
              <ScanSearch className="h-4 w-4" />
              Barrido
            </button>
            <button
              type="button"
              onClick={() => setShowConquestMode(true)}
              className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs"
            >
              <Radar className="h-4 w-4" />
              Conquista
            </button>
            <button
              type="button"
              onClick={() => setShowCsvImport(true)}
              className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs"
            >
              <Upload className="h-4 w-4" />
              CSV
            </button>
          </div>
        </div>

        {showMobileFilters ? (
          <div className="mt-2 rounded-[24px] border border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.95)] p-3 shadow-lg lg:hidden">
            <FiltersRow
              filters={filters}
              categories={categoryOptions}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
            <div className="mt-3 space-y-2">
              <CommercialContextInline
                ready={ready && profileReady}
                vertical={settings.vertical}
                saveState={saveState}
                onVerticalChange={setVertical}
                mobile
              />
              <SummaryTag total={prospectRecords.length} filtered={filteredRecords.length} />
            </div>
          </div>
        ) : null}

        {message ? (
          <div
            className={cn(
              "mt-2 rounded-lg border px-3 py-2 text-xs",
              message.type === "success"
                ? "border-[rgba(46,212,122,0.4)] bg-[rgba(46,212,122,0.12)] text-[rgba(220,255,234,0.98)]"
                : "border-[rgba(227,93,106,0.4)] bg-[rgba(227,93,106,0.12)] text-[rgba(255,224,229,0.98)]",
            )}
          >
            {message.text}
          </div>
        ) : null}
      </div>

      <div className="relative flex-1">
        {(loadingSaved || loadingOverpass) && (
          <div className="pointer-events-none absolute right-3 top-3 z-[450] rounded-2xl border border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.9)] px-3 py-2 text-xs text-[var(--pm-text-secondary)] shadow-[0_16px_40px_rgba(3,9,18,0.32)]">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingSaved ? "Cargando datos guardados" : "Cargando negocios reales"}
            </span>
          </div>
        )}

        {conquestSnapshot.totalCount > 0 ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-[430] hidden max-w-[320px] lg:block">
            <div className="pointer-events-auto rounded-[24px] border border-[rgba(42,52,66,0.92)] bg-[rgba(9,11,16,0.86)] p-4 shadow-[0_20px_48px_rgba(3,9,18,0.34)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="pm-kicker">Modo conquista</p>
                  <h3 className="pm-title mt-1 text-base">{conquestSnapshot.scopeLabel}</h3>
                  <p className="pm-muted mt-1 text-sm">
                    {conquestSnapshot.coveragePercent}% trabajado · {conquestSnapshot.openCount} oportunidades vivas
                  </p>
                </div>
                <button type="button" className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs" onClick={() => setShowConquestMode(true)}>
                  Ver
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="pm-card-soft">
                  <p className="pm-caption uppercase tracking-[0.14em]">Zona caliente</p>
                  <p className="mt-1 text-sm text-[var(--pm-text)]">{conquestSnapshot.hotZones[0]?.label ?? "Sin señal"}</p>
                </div>
                <div className="pm-card-soft">
                  <p className="pm-caption uppercase tracking-[0.14em]">Pendiente</p>
                  <p className="mt-1 text-sm text-[var(--pm-text)]">{conquestSnapshot.untouchedCount} sin tocar</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

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

      <div className="hidden h-full w-[440px] shrink-0 lg:block">
        <BusinessPanel
          key={selectedRecord?.business.key ?? "none-desktop"}
          selected={selectedBusiness}
          insight={selectedInsight}
          showDemoBadges
          notes={selectedNotes}
          notesLoading={loadingNotes}
          busy={busy}
          savingNote={savingNote}
          onClose={() => setSelectedKey(null)}
          onSaveOverpass={handleSaveOverpass}
          onUpdateBusiness={handleUpdateBusiness}
          onAddNote={handleAddNote}
        />
      </div>

      {showMobilePanel && selectedRecord ? (
        <div className="fixed inset-0 z-[500] bg-slate-950/55 backdrop-blur-sm lg:hidden" onClick={() => setShowMobilePanel(false)}>
          <div
            className="absolute inset-x-0 bottom-0 top-[14%] overflow-hidden rounded-t-[28px] border-t border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.98)] shadow-[0_-24px_60px_rgba(3,9,18,0.4)]"
            onClick={(event) => event.stopPropagation()}
          >
            <BusinessPanel
              key={selectedRecord.business.key}
              selected={selectedBusiness}
              insight={selectedInsight}
              showDemoBadges
              notes={selectedNotes}
              notesLoading={loadingNotes}
              busy={busy}
              savingNote={savingNote}
              onClose={() => setShowMobilePanel(false)}
              onSaveOverpass={handleSaveOverpass}
              onUpdateBusiness={handleUpdateBusiness}
              onAddNote={handleAddNote}
            />
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
    </div>
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
    <div className="fixed inset-0 z-[520] bg-slate-950/70 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[rgba(42,52,66,0.92)] bg-[rgba(9,11,16,0.98)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(42,52,66,0.72)] px-4 py-4">
          <div>
            <p className="pm-kicker">Modo conquista</p>
            <h2 className="pm-title mt-1 text-lg">Cobertura y potencial del territorio</h2>
            <p className="pm-muted mt-1 text-sm">{snapshot.scopeLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
            Cerrar
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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

function SummaryTag({ total, filtered }: { total: number; filtered: number }) {
  return (
    <div className="pm-badge rounded-2xl px-3 py-2 text-xs">
      <span>{filtered}</span>
      <span className="text-[var(--pm-text-tertiary)]">/</span>
      <span>{total} negocios</span>
    </div>
  );
}

function FiltersRow({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: BusinessFilters;
  categories: string[];
  onChange: (filters: BusinessFilters) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.category}
        onChange={(event) => onChange({ ...filters, category: event.target.value })}
        className="field min-h-0 rounded-2xl px-3 py-2 text-xs"
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
        className="field min-h-0 rounded-2xl px-3 py-2 text-xs"
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
        className="field min-h-0 rounded-2xl px-3 py-2 text-xs"
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
        className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs"
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
    <div className="fixed inset-0 z-[520] bg-slate-950/70 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.98)] shadow-2xl xl:grid xl:grid-cols-[1.2fr_0.8fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-0 flex-col border-b border-[rgba(30,51,80,0.72)] xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between border-b border-[rgba(30,51,80,0.72)] px-4 py-4">
            <div>
              <p className="pm-kicker">Barrido de zona</p>
              <h2 className="pm-title mt-1 text-lg">Mejores negocios de la zona visible</h2>
              <p className="pm-muted mt-1 text-sm">Vertical activa: {activeVerticalLabel}</p>
            </div>
            <button type="button" onClick={onClose} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
              Cerrar
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
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

        <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4">
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
          ? "Temporal"
          : saveState === "error"
            ? "Revisar"
            : "Listo";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", mobile ? "w-full" : "")}>
      <select
        value={vertical}
        onChange={(event) => onVerticalChange(event.target.value as VerticalId)}
        disabled={!ready}
        className="field min-h-0 rounded-2xl px-3 py-2 text-xs disabled:opacity-60"
      >
        {Object.values(VERTICAL_CONFIGS).map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <span className="pm-badge px-3 py-2 text-[11px]">{saveLabel}</span>
    </div>
  );
}
