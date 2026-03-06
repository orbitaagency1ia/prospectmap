"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Loader2, ScanSearch, Upload } from "lucide-react";

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
  const { settings, ready, saveState, setDemoMode, setVertical } = useCommercialConfig(profile.id);
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
        showMessage({ type: "error", text: `No se pudo guardar: ${error.message}` });
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
      })
      .eq("id", businessId);

    if (error) {
      showMessage({ type: "error", text: `No se pudo actualizar: ${error.message}` });
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
      showMessage({ type: "error", text: `No se pudo guardar nota: ${error.message}` });
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
    <div className="relative flex h-[calc(100vh-78px)] min-h-[620px] flex-1 overflow-hidden rounded-none lg:rounded-2xl lg:border lg:border-slate-800">
      <div className="absolute left-3 right-3 top-3 z-[450]">
        <div className="hidden flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/90 p-2 shadow-lg backdrop-blur lg:flex">
          <FiltersRow
            filters={filters}
            categories={categoryOptions}
            onChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />
          <CommercialContextInline
            ready={ready && profileReady}
            vertical={settings.vertical}
            demoMode={settings.demoMode}
            saveState={saveState}
            onVerticalChange={setVertical}
            onDemoModeChange={setDemoMode}
          />
          <button
            type="button"
            onClick={() => setShowSweepMode(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-700/50 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:border-cyan-500"
          >
            <ScanSearch className="h-4 w-4" />
            Modo Barrido
          </button>
          <button
            type="button"
            onClick={() => setShowCsvImport(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500"
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
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-200"
              onClick={() => setShowMobileFilters((value) => !value)}
            >
              <Filter className="h-4 w-4" />
              Filtros
            </button>
            <span className="inline-flex rounded-full border border-slate-700 bg-slate-950/90 px-3 py-2 text-[11px] font-medium text-slate-300">
              {ready ? VERTICAL_CONFIGS[settings.vertical].shortLabel : "Cargando..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSweepMode(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-700/50 bg-slate-950/90 px-3 py-2 text-xs text-cyan-100"
            >
              <ScanSearch className="h-4 w-4" />
              Barrido
            </button>
            <button
              type="button"
              onClick={() => setShowCsvImport(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-200"
            >
              <Upload className="h-4 w-4" />
              CSV
            </button>
          </div>
        </div>

        {showMobileFilters ? (
          <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950/95 p-3 shadow-lg lg:hidden">
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
                demoMode={settings.demoMode}
                saveState={saveState}
                onVerticalChange={setVertical}
                onDemoModeChange={setDemoMode}
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
                ? "border-emerald-700/70 bg-emerald-900/30 text-emerald-200"
                : "border-rose-700/70 bg-rose-900/30 text-rose-200",
            )}
          >
            {message.text}
          </div>
        ) : null}
      </div>

      <div className="relative flex-1">
        {(loadingSaved || loadingOverpass) && (
          <div className="pointer-events-none absolute right-3 top-3 z-[450] rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {loadingSaved ? "Cargando datos guardados" : "Cargando negocios reales"}
            </span>
          </div>
        )}

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
          showDemoBadges={settings.demoMode}
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
            className="absolute inset-x-0 bottom-0 top-[16%] overflow-hidden rounded-t-2xl border-t border-slate-700 bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <BusinessPanel
              key={selectedRecord.business.key}
              selected={selectedBusiness}
              insight={selectedInsight}
              showDemoBadges={settings.demoMode}
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
          showDemoBadges={settings.demoMode}
          onClose={() => setShowSweepMode(false)}
          onSelect={(record) => setSweepSelectedKey(record.business.key)}
          onOpenBusiness={(record) => {
            setSelectedKey(record.business.key);
            setShowSweepMode(false);
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

function SummaryTag({ total, filtered }: { total: number; filtered: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
      <span>{filtered}</span>
      <span className="text-slate-500">/</span>
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
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
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
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
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
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
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
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
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
        className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl xl:grid xl:grid-cols-[1.2fr_0.8fr]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-0 flex-col border-b border-slate-800 xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Modo Barrido</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-100">Mejores negocios de la zona visible</h2>
              <p className="mt-1 text-sm text-slate-400">Vertical activa: {activeVerticalLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200"
            >
              Cerrar
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {records.length === 0 ? (
              <p className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
                No hay suficientes negocios visibles para generar barrido. Mueve el mapa o baja el zoom.
              </p>
            ) : null}
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
            emptyText="Selecciona un negocio del barrido para ver servicio, accion y mensajes."
          />
          {selectedRecord ? (
            <button
              type="button"
              onClick={() => onOpenBusiness(selectedRecord)}
              className="w-full rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
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
  demoMode,
  saveState,
  onVerticalChange,
  onDemoModeChange,
  mobile = false,
}: {
  ready: boolean;
  vertical: VerticalId;
  demoMode: boolean;
  saveState: "idle" | "saving" | "saved" | "local_only" | "error";
  onVerticalChange: (vertical: VerticalId) => void;
  onDemoModeChange: (demoMode: boolean) => void;
  mobile?: boolean;
}) {
  const saveLabel =
    saveState === "saving"
      ? "Guardando"
      : saveState === "saved"
        ? "Supabase"
        : saveState === "local_only"
          ? "Solo local"
          : saveState === "error"
            ? "Error"
            : "Activo";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", mobile ? "w-full" : "")}>
      <select
        value={vertical}
        onChange={(event) => onVerticalChange(event.target.value as VerticalId)}
        disabled={!ready}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 disabled:opacity-60"
      >
        {Object.values(VERTICAL_CONFIGS).map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onDemoModeChange(!demoMode)}
        disabled={!ready}
        className={cn(
          "rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-60",
          demoMode
            ? "border-amber-500/60 bg-amber-500/15 text-amber-100"
            : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500",
        )}
      >
        Demo {demoMode ? "ON" : "OFF"}
      </button>
      <span className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] text-slate-400">
        {saveLabel}
      </span>
    </div>
  );
}
