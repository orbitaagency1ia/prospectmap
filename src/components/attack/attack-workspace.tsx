"use client";

import type { ComponentType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleOff,
  Copy,
  Crosshair,
  Flame,
  Gauge,
  ListFilter,
  Pin,
  Play,
  SkipForward,
  Target,
  TimerReset,
  Trophy,
} from "lucide-react";

import { mergeBusinesses } from "@/lib/business-helpers";
import { PRIORITY_OPTIONS, STATUS_META, type PriorityLevel, type ProspectStatus } from "@/lib/constants";
import {
  ATTACK_RESULT_OPTIONS,
  DEFAULT_ATTACK_FILTERS,
  DEFAULT_ATTACK_RESULT_DRAFT,
  SERVICE_META,
  VERTICAL_CONFIGS,
  buildAttackNextStepSuggestion,
  buildAttackQueue,
  buildAttackSessionFiltersSnapshot,
  buildAttackSessionKpis,
  buildAttackSessionProgress,
  buildDefaultAttackSessionName,
  buildProspectRecords,
  getCurrentAttackLead,
  isAccountCommercialProfileComplete,
  type AttackNextStepSuggestion,
  type AttackQueueEntry,
  type AttackQueueFilters,
  type AttackResultDraft,
  type AttackSessionFiltersSnapshot,
  type AttackSessionSource,
  type OrbitaService,
  type ProspectRecord,
  type UrgencyLevel,
  type VerticalId,
} from "@/lib/prospect-intelligence";
import type { ProfileRow, ProspectListRow } from "@/lib/types";
import { cn, formatCurrency, formatDateTime, formatDaysSince } from "@/lib/utils";

import { CommercialControlBar } from "../commercial/commercial-control-bar";
import { useAccountCommercialProfile } from "../commercial/use-account-commercial-profile";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { PmBadge, PmEmpty, PmHero, PmMetric, PmNotice, PmPanel, PmSectionHeader } from "../ui/pm";

import { useAttackSession } from "./use-attack-session";
import { OpportunityBadge, UrgencyBadge } from "../prospects/prospect-ui";
import { useProspectLists } from "../prospects/use-prospect-lists";
import { useSavedProspects } from "../prospects/use-saved-prospects";

type Props = {
  profile: ProfileRow;
};

type TerritoryBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type AttackIntent = {
  source: AttackSessionSource;
  filters: AttackQueueFilters;
  territoryBounds: TerritoryBounds | null;
  territoryLabel: string | null;
  sourceBusinessKey: string | null;
  sourceRef: string | null;
};

const SESSION_TARGET_SIZE = 12;
const QUEUE_PREVIEW_SIZE = 18;

const PIPELINE_STATUSES: ProspectStatus[] = [
  "contactado",
  "reunion_agendada",
  "propuesta_enviada",
  "negociacion",
];

const ATTACK_SOURCE_LABELS: Record<AttackSessionSource, string> = {
  daily_queue: "Ataque del día",
  list: "Campaña",
  territory: "Territorio",
  priorities: "Prioridades",
  pipeline: "Pipeline",
  alerts: "Alertas",
  manual: "Manual",
};

const URGENCY_OPTIONS: Array<{ value: UrgencyLevel | "all"; label: string }> = [
  { value: "all", label: "Urgencia: todas" },
  { value: "alta", label: "Urgencia alta" },
  { value: "media", label: "Urgencia media" },
  { value: "baja", label: "Urgencia baja" },
];

function isVertical(value: string): value is VerticalId {
  return value in VERTICAL_CONFIGS;
}

function isService(value: string): value is OrbitaService {
  return value in SERVICE_META;
}

function isUrgency(value: string): value is UrgencyLevel {
  return value === "alta" || value === "media" || value === "baja";
}

function isSource(value: string): value is AttackSessionSource {
  return value === "daily_queue" || value === "list" || value === "territory" || value === "priorities" || value === "pipeline" || value === "alerts" || value === "manual";
}

function toNumberOrNull(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDatetimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toIsoOrNull(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function readAttackIntent(rawSearch: string): AttackIntent {
  const params = new URLSearchParams(rawSearch);
  const source = isSource(params.get("source") ?? "") ? (params.get("source") as AttackSessionSource) : "daily_queue";

  const south = toNumberOrNull(params.get("south"));
  const west = toNumberOrNull(params.get("west"));
  const north = toNumberOrNull(params.get("north"));
  const east = toNumberOrNull(params.get("east"));

  return {
    source,
    filters: {
      city: params.get("city") || DEFAULT_ATTACK_FILTERS.city,
      vertical: isVertical(params.get("vertical") ?? "") ? (params.get("vertical") as VerticalId) : DEFAULT_ATTACK_FILTERS.vertical,
      listId: params.get("listId") || DEFAULT_ATTACK_FILTERS.listId,
      service: isService(params.get("service") ?? "") ? (params.get("service") as OrbitaService) : DEFAULT_ATTACK_FILTERS.service,
      urgency: isUrgency(params.get("urgency") ?? "") ? (params.get("urgency") as UrgencyLevel) : DEFAULT_ATTACK_FILTERS.urgency,
      zone: params.get("zone") || DEFAULT_ATTACK_FILTERS.zone,
      territoryOnly: params.get("territoryOnly") === "1" || params.get("territoryOnly") === "true",
      followUpOnly: params.get("followUpOnly") === "1" || params.get("followUpOnly") === "true",
    },
    territoryBounds:
      south !== null && west !== null && north !== null && east !== null
        ? {
            south,
            west,
            north,
            east,
          }
        : null,
    territoryLabel: params.get("territoryLabel"),
    sourceBusinessKey: params.get("focus"),
    sourceRef: params.get("listId") || params.get("territoryLabel") || null,
  };
}

function normalizeSessionSnapshot(value: unknown): AttackSessionFiltersSnapshot {
  if (!value || typeof value !== "object") {
    return buildAttackSessionFiltersSnapshot(DEFAULT_ATTACK_FILTERS);
  }

  const input = value as Partial<AttackSessionFiltersSnapshot>;

  return {
    city: typeof input.city === "string" ? input.city : "all",
    vertical: typeof input.vertical === "string" && isVertical(input.vertical) ? input.vertical : "all",
    listId: typeof input.listId === "string" ? input.listId : "all",
    service: typeof input.service === "string" && isService(input.service) ? input.service : "all",
    urgency: typeof input.urgency === "string" && isUrgency(input.urgency) ? input.urgency : "all",
    zone: typeof input.zone === "string" ? input.zone : "all",
    territoryLabel: typeof input.territoryLabel === "string" ? input.territoryLabel : undefined,
    sourceBusinessKey: typeof input.sourceBusinessKey === "string" ? input.sourceBusinessKey : undefined,
  };
}

function buildScopedRecords(args: {
  records: ProspectRecord[];
  source: AttackSessionSource;
  filters: AttackQueueFilters;
  listItemPairs: Array<{ listId: string; businessId: string }>;
  sourceBusinessKey?: string | null;
}) {
  const listMembership = new Map<string, string[]>();

  args.listItemPairs.forEach((item) => {
    listMembership.set(item.businessId, [...(listMembership.get(item.businessId) ?? []), item.listId]);
  });

  switch (args.source) {
    case "priorities":
      return args.records
        .filter((record) => record.insight.score >= 60 || record.business.priority === "alta")
        .sort((a, b) => b.insight.score - a.insight.score);
    case "pipeline":
      return args.records.filter(
        (record) =>
          PIPELINE_STATUSES.includes(record.business.status) ||
          record.insight.followUpDue ||
          record.insight.coolingDown,
      );
    case "alerts":
      return args.records.filter(
        (record) =>
          record.insight.followUpDue ||
          record.insight.coolingDown ||
          (record.business.status === "sin_contactar" && record.insight.score >= 78) ||
          record.insight.weightedValue >= 2200,
      );
    case "list":
      if (args.filters.listId === "all") {
        return args.records;
      }

      return args.records.filter((record) => {
        const businessId = record.business.business?.id;
        return businessId ? (listMembership.get(businessId) ?? []).includes(args.filters.listId) : false;
      });
    case "manual":
      if (!args.sourceBusinessKey) {
        return args.records;
      }

      return args.records.filter((record) => record.business.key === args.sourceBusinessKey);
    default:
      return args.records;
  }
}

function getDefaultResult(record: AttackQueueEntry): AttackResultDraft["result"] {
  if (record.insight.followUpDue) {
    return "hablo_con_alguien";
  }

  if (record.business.status === "sin_contactar") {
    return "contacto_intentado";
  }

  if (record.business.status === "reunion_agendada" || record.business.status === "propuesta_enviada") {
    return "propuesta_pendiente";
  }

  return "hablo_con_alguien";
}

function buildDefaultResultDraft(record: AttackQueueEntry | null): AttackResultDraft {
  if (!record) {
    return DEFAULT_ATTACK_RESULT_DRAFT;
  }

  const result = getDefaultResult(record);
  const suggestion = buildAttackNextStepSuggestion({
    result,
    insight: record.insight,
    currentStatus: record.business.status,
  });

  return {
    ...DEFAULT_ATTACK_RESULT_DRAFT,
    result,
    followUpAt: toDatetimeLocalValue(suggestion.dueAt),
    priority: suggestion.nextPriority ?? "",
    moveToPipeline: Boolean(suggestion.moveToPipeline),
    discard: Boolean(suggestion.archive),
  };
}

function getActiveQueueItemLabel(entry: AttackQueueEntry) {
  if (entry.pinnedForToday) {
    return "Fijado";
  }

  if (entry.sessionItemStatus === "in_progress") {
    return "En foco";
  }

  if (entry.sessionItemStatus === "worked") {
    return "Trabajado";
  }

  if (entry.sessionItemStatus === "dismissed") {
    return "Descartado";
  }

  if (entry.sessionItemStatus === "skipped") {
    return "Saltado";
  }

  return "Pendiente";
}

function getActiveQueueTone(entry: AttackQueueEntry) {
  if (entry.sessionItemStatus === "worked") {
    return "emerald" as const;
  }

  if (entry.sessionItemStatus === "dismissed") {
    return "rose" as const;
  }

  if (entry.sessionItemStatus === "in_progress" || entry.pinnedForToday) {
    return "amber" as const;
  }

  return "neutral" as const;
}

export function AttackWorkspace({ profile }: Props) {
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const intent = useMemo(() => readAttackIntent(searchKey), [searchKey]);

  return <AttackWorkspaceScreen key={searchKey} profile={profile} intent={intent} />;
}

function AttackWorkspaceScreen({
  profile,
  intent,
}: Props & {
  intent: AttackIntent;
}) {
  const [filters, setFilters] = useState<AttackQueueFilters>(intent.filters);
  const [manualSelectedKey, setManualSelectedKey] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<{
    leadKey: string | null;
    draft: AttackResultDraft;
  }>({
    leadKey: null,
    draft: DEFAULT_ATTACK_RESULT_DRAFT,
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const { businesses, latestNotes, loading, error, reload } = useSavedProspects();
  const { settings, ready, saveState, setVertical } = useCommercialConfig(profile.id);
  const { profile: accountProfile, ready: profileReady } = useAccountCommercialProfile(profile.id);
  const { lists, items, loading: listsLoading } = useProspectLists(profile.id);
  const attack = useAttackSession(profile.id);

  const combinedBusinesses = useMemo(
    () =>
      mergeBusinesses({
        savedBusinesses: businesses,
        overpassBusinesses: [],
        latestNotes,
      }),
    [businesses, latestNotes],
  );

  const records = useMemo(
    () => buildProspectRecords(combinedBusinesses, settings, accountProfile, profile.city_name),
    [accountProfile, combinedBusinesses, profile.city_name, settings],
  );

  const listPairs = useMemo(
    () =>
      items.map((item) => ({
        listId: item.list_id,
        businessId: item.business_id,
      })),
    [items],
  );

  const seedRecords = useMemo(
    () =>
      buildScopedRecords({
        records,
        source: intent.source,
        filters,
        listItemPairs: listPairs,
        sourceBusinessKey: intent.sourceBusinessKey,
      }),
    [filters, intent.source, intent.sourceBusinessKey, listPairs, records],
  );

  const previewQueue = useMemo(
    () =>
      buildAttackQueue(seedRecords, {
        filters,
        source: intent.source,
        sourceBusinessKey: intent.sourceBusinessKey,
        territoryBounds: intent.territoryBounds,
        territoryLabel: intent.territoryLabel,
        lists,
        listItems: items,
      }),
    [filters, intent.source, intent.sourceBusinessKey, intent.territoryBounds, intent.territoryLabel, items, lists, seedRecords],
  );

  const sessionSnapshot = useMemo(
    () => normalizeSessionSnapshot(attack.session?.queue_filters ?? null),
    [attack.session?.queue_filters],
  );

  const sessionQueue = useMemo(
    () =>
      attack.session
        ? buildAttackQueue(records, {
            filters: {
              ...DEFAULT_ATTACK_FILTERS,
              city: sessionSnapshot.city,
              vertical: sessionSnapshot.vertical,
              listId: sessionSnapshot.listId,
              service: sessionSnapshot.service,
              urgency: sessionSnapshot.urgency,
              zone: sessionSnapshot.zone,
            },
            source: attack.session.source,
            sourceBusinessKey: sessionSnapshot.sourceBusinessKey ?? null,
            territoryLabel: sessionSnapshot.territoryLabel ?? null,
            lists,
            listItems: items,
            sessionItems: attack.items,
          })
        : [],
    [attack.items, attack.session, items, lists, records, sessionSnapshot],
  );

  const queue = attack.session ? sessionQueue : previewQueue.slice(0, QUEUE_PREVIEW_SIZE);
  const sessionStartEntries = previewQueue.slice(0, SESSION_TARGET_SIZE);
  const selectedKey = queue.some((entry) => entry.business.key === manualSelectedKey) ? manualSelectedKey : null;
  const currentLead = useMemo(() => {
    const selected = queue.find((entry) => entry.business.key === selectedKey) ?? null;
    return selected ?? getCurrentAttackLead(queue);
  }, [queue, selectedKey]);
  const resultDraft = useMemo(
    () => (draftState.leadKey === currentLead?.business.key ? draftState.draft : buildDefaultResultDraft(currentLead)),
    [currentLead, draftState],
  );

  const sessionProgress = useMemo(() => buildAttackSessionProgress(queue), [queue]);
  const sessionKpis = useMemo(
    () =>
      buildAttackSessionKpis({
        entries: queue,
        resultsToday: attack.resultsToday,
        startedAt: attack.session?.started_at ?? null,
      }),
    [attack.resultsToday, attack.session?.started_at, queue],
  );

  const suggestion = useMemo(
    () =>
      currentLead
        ? buildAttackNextStepSuggestion({
            result: resultDraft.result,
            insight: currentLead.insight,
            currentStatus: currentLead.business.status,
          })
        : null,
    [currentLead, resultDraft.result],
  );

  const cityOptions = useMemo(
    () => ["all", ...Array.from(new Set(records.map((record) => record.insight.cityLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es"))],
    [records],
  );
  const zoneOptions = useMemo(() => ["all", ...Array.from(new Set(previewQueue.map((entry) => entry.zoneKey)))], [previewQueue]);

  const updateDraftFromSuggestion = (nextResult: AttackResultDraft["result"], applySuggestion: boolean) => {
    if (!currentLead || !applySuggestion) {
      return;
    }

    const nextSuggestion = buildAttackNextStepSuggestion({
      result: nextResult,
      insight: currentLead.insight,
      currentStatus: currentLead.business.status,
    });

    setDraftState({
      leadKey: currentLead.business.key,
      draft: {
        ...resultDraft,
        result: nextResult,
        followUpAt: toDatetimeLocalValue(nextSuggestion.dueAt),
        priority: nextSuggestion.nextPriority ?? "",
        moveToPipeline: Boolean(nextSuggestion.moveToPipeline),
        discard: Boolean(nextSuggestion.archive),
      },
    });
  };

  const handleStartSession = async () => {
    if (sessionStartEntries.length === 0) {
      setFeedback("No hay leads suficientes con este foco.");
      return;
    }

    const result = await attack.createSession({
      name: buildDefaultAttackSessionName(
        intent.source,
        intent.source === "list"
          ? lists.find((list) => list.id === filters.listId)?.name ?? intent.territoryLabel ?? null
          : intent.territoryLabel,
      ),
      source: intent.source,
      sourceRef: intent.sourceRef,
      filtersSnapshot: buildAttackSessionFiltersSnapshot(filters, {
        territoryLabel: intent.territoryLabel,
        sourceBusinessKey: intent.sourceBusinessKey,
      }),
      entries: sessionStartEntries,
    });

    setFeedback(result.ok ? "Sesión lista." : result.error);
    if (result.ok) {
      setManualSelectedKey(sessionStartEntries[0]?.business.key ?? null);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copiado.`);
      window.setTimeout(() => setFeedback(null), 1400);
    } catch {
      setFeedback("No pude copiar ese texto.");
    }
  };

  const handleQuickDismiss = useCallback(async (entry: AttackQueueEntry) => {
    const result = await attack.saveResult({
      record: entry,
      result: "no_encaja",
      noteText: "Marcado como no relevante desde Ataque.",
      discard: true,
      suggestion: buildAttackNextStepSuggestion({
        result: "no_encaja",
        insight: entry.insight,
        currentStatus: entry.business.status,
      }),
    });

    setFeedback(result.ok ? "Lead descartado." : result.error);
    if (result.ok) {
      setManualSelectedKey(null);
      await reload();
    }
  }, [attack, reload]);

  const handleSkip = useCallback(async (entry: AttackQueueEntry) => {
    if (!entry.sessionItemId) {
      return;
    }

    const result = await attack.updateItemStatus(entry.sessionItemId, "skipped");
    setFeedback(result.ok ? "Lead saltado." : result.error);
    if (result.ok) {
      setManualSelectedKey(null);
    }
  }, [attack]);

  const handleMoveToEnd = useCallback(async (entry: AttackQueueEntry) => {
    if (!entry.sessionItemId) {
      return;
    }

    const result = await attack.moveToEnd(entry.sessionItemId);
    setFeedback(result.ok ? "Lead movido al final." : result.error);
    if (result.ok) {
      setManualSelectedKey(null);
    }
  }, [attack]);

  const handlePin = useCallback(async (entry: AttackQueueEntry) => {
    if (!entry.sessionItemId) {
      return;
    }

    const result = await attack.togglePin(entry.sessionItemId, !entry.pinnedForToday);
    setFeedback(result.ok ? (entry.pinnedForToday ? "Lead desfijado." : "Lead fijado para hoy.") : result.error);
  }, [attack]);

  const handleSubmitResult = useCallback(async () => {
    if (!currentLead) {
      return;
    }

    const result = await attack.saveResult({
      record: currentLead,
      result: resultDraft.result,
      noteText: resultDraft.noteText,
      followUpAt: resultDraft.followUpAt ? toIsoOrNull(resultDraft.followUpAt) : null,
      priority: resultDraft.priority || null,
      suggestion: resultDraft.applySuggestion ? suggestion : null,
      moveToPipeline: resultDraft.moveToPipeline,
      discard: resultDraft.discard,
      listId: resultDraft.listId || null,
    });

    setFeedback(result.ok ? "Resultado registrado." : result.error);
    if (result.ok) {
      setManualSelectedKey(null);
      setDraftState({
        leadKey: null,
        draft: DEFAULT_ATTACK_RESULT_DRAFT,
      });
      await reload();
    }
  }, [attack, currentLead, reload, resultDraft, suggestion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void handleSubmitResult();
        return;
      }

      if (!currentLead) {
        return;
      }

      if (key === "s" && currentLead.sessionItemId) {
        event.preventDefault();
        void handleSkip(currentLead);
        return;
      }

      if (key === "d") {
        event.preventDefault();
        void handleQuickDismiss(currentLead);
        return;
      }

      if (key === "p" && currentLead.sessionItemId) {
        event.preventDefault();
        void handlePin(currentLead);
        return;
      }

      if (key === "e" && currentLead.sessionItemId) {
        event.preventDefault();
        void handleMoveToEnd(currentLead);
        return;
      }

      const currentIndex = queue.findIndex((entry) => entry.business.key === currentLead.business.key);
      if (key === "j" && currentIndex >= 0 && queue[currentIndex + 1]) {
        event.preventDefault();
        setManualSelectedKey(queue[currentIndex + 1].business.key);
        return;
      }

      if (key === "k" && currentIndex > 0 && queue[currentIndex - 1]) {
        event.preventDefault();
        setManualSelectedKey(queue[currentIndex - 1].business.key);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentLead, handleMoveToEnd, handlePin, handleQuickDismiss, handleSkip, handleSubmitResult, queue]);

  if (loading || !ready || !profileReady || listsLoading || attack.loading) {
    return <PageState text="Montando Attack Workspace..." />;
  }

  if (error) {
    return <PageState text={error} />;
  }

  return (
    <div className="pm-page">
      <CommercialControlBar settings={settings} onVerticalChange={setVertical} saveState={saveState} />

      {!attack.tableAvailable ? (
        <PmNotice tone="amber">
          La sesión de ataque aún no está lista en esta instalación. Activa la base de datos de ataque para guardar progreso y resultados.
        </PmNotice>
      ) : null}

      {!isAccountCommercialProfileComplete(accountProfile) ? (
        <PmNotice tone="amber">
          El perfil comercial todavía está incompleto. La cola de ataque ya funciona, pero el briefing mejora mucho cuando completas ICP, oferta y ticket en `Configuración`.
        </PmNotice>
      ) : null}

      <PmHero
        eyebrow="Attack Workspace"
        title="Ejecución diaria, sin fricción."
        description="La cola del día, el lead en foco y el siguiente paso listos para trabajar sin perder ritmo."
        actions={
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="pm-caption">Estado de la sesión</p>
              <p className="text-sm leading-6 text-[var(--pm-text)]">
                {attack.session ? `${sessionProgress.pending} pendientes · ${sessionProgress.percent}% completado` : `${previewQueue.length} leads detectados`}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PmMetric label="En sesión" value={sessionProgress.total} helper={`${sessionProgress.pending} pendientes`} tone="amber" />
              <PmMetric label="Valor tocado" value={formatCurrency(sessionKpis.workedValue)} helper={sessionKpis.averagePaceMinutes ? `${sessionKpis.averagePaceMinutes} min por lead` : "Sin ritmo todavía"} tone="emerald" />
            </div>
          </div>
        }
      >
        <div className="pm-hero-metrics">
          <PmMetric label="Trabajados hoy" value={sessionKpis.workedToday} helper={`${sessionKpis.sessionAdvance}% de avance`} />
          <PmMetric label="Follow-ups" value={sessionKpis.followUpsScheduled} helper="Programados hoy" tone="violet" />
          <PmMetric label="Reuniones potenciales" value={sessionKpis.meetingsUnlocked} helper="Desbloqueadas hoy" tone="emerald" />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <PmBadge tone="amber">{ATTACK_SOURCE_LABELS[attack.session?.source ?? intent.source]}</PmBadge>
          {attack.session ? <PmBadge>{attack.session.status === "paused" ? "Sesión pausada" : "Sesión en curso"}</PmBadge> : null}
          {intent.territoryLabel ? <PmBadge>{intent.territoryLabel}</PmBadge> : null}
          <PmBadge>Atajos: Ctrl/⌘+Enter guardar · J/K navegar · S saltar · D descartar</PmBadge>
          {feedback ? <PmBadge tone="emerald">{feedback}</PmBadge> : null}
          {attack.error ? <PmBadge tone="rose">{attack.error}</PmBadge> : null}
        </div>
      </PmHero>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.38fr] pm-animate-rise">
        <div className="space-y-5">
          <SessionControlPanel
            sourceLabel={ATTACK_SOURCE_LABELS[attack.session?.source ?? intent.source]}
            sessionName={attack.session?.name ?? buildDefaultAttackSessionName(intent.source, intent.territoryLabel)}
            progress={sessionProgress}
            attackStatus={attack.session?.status ?? null}
            sourceHint={buildSourceHint(intent.source, filters, lists)}
            queueSize={previewQueue.length}
            startSize={sessionStartEntries.length}
            attackBusy={attack.busy}
            hasActiveSession={Boolean(attack.session)}
            onStartSession={handleStartSession}
            onPauseSession={() => void attack.updateSession({ status: "paused" })}
            onResumeSession={() => void attack.updateSession({ status: "active", ended_at: null })}
            onCompleteSession={() => void attack.updateSession({ status: "completed", ended_at: new Date().toISOString() })}
          />

          <QueueFiltersPanel
            filters={filters}
            onChange={setFilters}
            disabled={Boolean(attack.session)}
            cityOptions={cityOptions}
            zoneOptions={zoneOptions}
            listOptions={lists}
          />

          <QueuePanel
            entries={queue}
            hasActiveSession={Boolean(attack.session)}
            selectedKey={selectedKey}
            onSelect={setManualSelectedKey}
            onSetCurrent={(entry) => {
              setManualSelectedKey(entry.business.key);
              if (entry.sessionItemId) {
                void attack.setCurrentItem(entry.sessionItemId);
              }
            }}
            onSkip={handleSkip}
            onMoveToEnd={handleMoveToEnd}
            onDismiss={handleQuickDismiss}
            onPin={handlePin}
          />
        </div>

        <div className="space-y-4 xl:sticky xl:top-[7.75rem] xl:self-start">
          <LeadBriefingPanel
            record={currentLead}
            suggestion={suggestion}
            resultDraft={resultDraft}
            lists={lists}
            busy={attack.busy}
            onCopy={handleCopy}
            onChangeDraft={(patch) =>
              setDraftState({
                leadKey: currentLead?.business.key ?? null,
                draft: { ...resultDraft, ...patch },
              })
            }
            onChangeResult={(nextResult) => {
              setDraftState({
                leadKey: currentLead?.business.key ?? null,
                draft: { ...resultDraft, result: nextResult },
              });
              updateDraftFromSuggestion(nextResult, resultDraft.applySuggestion);
            }}
            onToggleApplySuggestion={(applySuggestion) => {
              setDraftState({
                leadKey: currentLead?.business.key ?? null,
                draft: { ...resultDraft, applySuggestion },
              });
              if (applySuggestion) {
                updateDraftFromSuggestion(resultDraft.result, true);
              }
            }}
            onQuickPreset={(preset) => {
              const nextDraft: Partial<AttackResultDraft> =
                preset === "call"
                  ? { result: "hablo_con_alguien" }
                  : preset === "follow_up"
                    ? { result: "volver_mas_tarde", followUpAt: toDatetimeLocalValue(new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()) }
                    : preset === "priority"
                      ? { priority: "alta" }
                      : preset === "pipeline"
                        ? { moveToPipeline: true, result: "interesado" }
                        : { discard: true, result: "no_encaja" };

              setDraftState({
                leadKey: currentLead?.business.key ?? null,
                draft: { ...resultDraft, ...nextDraft },
              });
            }}
            onSave={handleSubmitResult}
            onSkipCurrent={currentLead ? () => handleSkip(currentLead) : undefined}
            onMoveCurrentToEnd={currentLead ? () => handleMoveToEnd(currentLead) : undefined}
            onPinCurrent={currentLead ? () => handlePin(currentLead) : undefined}
            onDismissCurrent={currentLead ? () => handleQuickDismiss(currentLead) : undefined}
          />

          <KpiRail kpis={sessionKpis} progress={sessionProgress} />
        </div>
      </div>
    </div>
  );
}

function buildSourceHint(source: AttackSessionSource, filters: AttackQueueFilters, lists: ProspectListRow[]) {
  switch (source) {
    case "list":
      return filters.listId !== "all" ? `Campaña: ${lists.find((list) => list.id === filters.listId)?.name ?? "selección actual"}` : "Campaña operativa";
    case "territory":
      return "Priorizando la zona visible o territorio elegido.";
    case "pipeline":
      return "Foco en cuentas vivas, seguimiento y movimiento hacia cierre.";
    case "priorities":
      return "Ordenado por score, urgencia y valor ponderado.";
    case "alerts":
      return "Leads que piden acción por urgencia, enfriamiento o valor.";
    case "manual":
      return "Sesión centrada en un lead concreto.";
    default:
      return "La cola del día combina score, urgencia, valor y seguimiento.";
  }
}

function QueueFiltersPanel({
  filters,
  onChange,
  disabled,
  cityOptions,
  zoneOptions,
  listOptions,
}: {
  filters: AttackQueueFilters;
  onChange: (next: AttackQueueFilters) => void;
  disabled: boolean;
  cityOptions: string[];
  zoneOptions: string[];
  listOptions: ProspectListRow[];
}) {
  return (
    <PmPanel className="p-4">
      <PmSectionHeader
        eyebrow="Cola de ataque"
        title="Qué entra en foco"
        description={disabled ? "Los filtros de esta sesión ya están fijados. Se aplicarán al arrancar la siguiente." : "Recorta la cola por ciudad, vertical, campaña, servicio, urgencia y zona."}
        action={<PmBadge tone={disabled ? "amber" : "neutral"}>{disabled ? "Sesión bloqueada" : "Filtros listos"}</PmBadge>}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FilterSelect
          label="Ciudad"
          value={filters.city}
          disabled={disabled}
          onChange={(value) => onChange({ ...filters, city: value })}
          options={cityOptions.map((option) => ({ value: option, label: option === "all" ? "Todas las ciudades" : option }))}
        />
        <FilterSelect
          label="Vertical"
          value={filters.vertical}
          disabled={disabled}
          onChange={(value) => onChange({ ...filters, vertical: value as VerticalId | "all" })}
          options={[
            { value: "all", label: "Todas las verticales" },
            ...Object.values(VERTICAL_CONFIGS).map((vertical) => ({ value: vertical.id, label: vertical.label })),
          ]}
        />
        <FilterSelect
          label="Campaña"
          value={filters.listId}
          disabled={disabled}
          onChange={(value) => onChange({ ...filters, listId: value })}
          options={[
            { value: "all", label: "Todas las campañas" },
            ...listOptions.map((list) => ({ value: list.id, label: list.name })),
          ]}
        />
        <FilterSelect
          label="Servicio"
          value={filters.service}
          disabled={disabled}
          onChange={(value) => onChange({ ...filters, service: value as OrbitaService | "all" })}
          options={[
            { value: "all", label: "Todos los servicios" },
            ...Object.entries(SERVICE_META).map(([value, meta]) => ({ value, label: meta.shortLabel })),
          ]}
        />
        <FilterSelect
          label="Urgencia"
          value={filters.urgency}
          disabled={disabled}
          onChange={(value) => onChange({ ...filters, urgency: value as UrgencyLevel | "all" })}
          options={URGENCY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        />
        <FilterSelect
          label="Zona"
          value={filters.zone}
          disabled={disabled}
          onChange={(value) => onChange({ ...filters, zone: value })}
          options={zoneOptions.map((option) => ({ value: option, label: option === "all" ? "Todas las zonas" : option }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--pm-text-secondary)]">
          <input
            type="checkbox"
            checked={filters.followUpOnly}
            disabled={disabled}
            onChange={(event) => onChange({ ...filters, followUpOnly: event.target.checked })}
            className="h-4 w-4 rounded border border-[var(--pm-border)] bg-[var(--pm-surface)] accent-[var(--pm-primary)]"
          />
          Solo follow-ups vencidos
        </label>
      </div>
    </PmPanel>
  );
}

function QueuePanel({
  entries,
  hasActiveSession,
  selectedKey,
  onSelect,
  onSetCurrent,
  onSkip,
  onMoveToEnd,
  onDismiss,
  onPin,
}: {
  entries: AttackQueueEntry[];
  hasActiveSession: boolean;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onSetCurrent: (entry: AttackQueueEntry) => void;
  onSkip: (entry: AttackQueueEntry) => void;
  onMoveToEnd: (entry: AttackQueueEntry) => void;
  onDismiss: (entry: AttackQueueEntry) => void;
  onPin: (entry: AttackQueueEntry) => void;
}) {
  return (
    <PmPanel className="p-4">
      <PmSectionHeader
        title={hasActiveSession ? "Cola activa" : "Preview de sesión"}
        description={
          hasActiveSession
            ? "Cada lead ya está ordenado para ejecutar, registrar resultado y seguir con el siguiente."
            : "Así quedará la sesión al arrancar. ProspectMap tomará los primeros leads de esta cola."
        }
      />

      <div className="mt-4 space-y-3 pm-stagger">
        {entries.length === 0 ? (
          <PmEmpty body="No hay leads que encajen con este foco ahora mismo." />
        ) : null}

        {entries.map((entry, index) => (
          <article
            key={entry.business.key}
            className={cn(
              "pm-list-row rounded-[24px] p-4 text-left",
              selectedKey === entry.business.key
                ? "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] shadow-[0_18px_42px_rgba(3,9,18,0.24)]"
                : "",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <button type="button" onClick={() => onSelect(entry.business.key)} className="min-w-0 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--pm-text)]">{entry.business.name}</p>
                  <PmBadge tone={getActiveQueueTone(entry)}>{getActiveQueueItemLabel(entry)}</PmBadge>
                  {entry.queuePosition !== undefined ? <PmBadge>{entry.queuePosition + 1}</PmBadge> : <PmBadge>{index + 1}</PmBadge>}
                </div>
                <p className="mt-1 text-xs text-[var(--pm-text-secondary)]">
                  {entry.insight.sectorLabel} · {entry.insight.cityLabel} · {entry.zoneLabel}
                </p>
              </button>

              <div className="text-right">
                <p className="text-xl font-semibold text-[var(--pm-text)]">{entry.insight.score}</p>
                <p className="text-xs text-[var(--pm-text-tertiary)]">{formatCurrency(entry.insight.weightedValue)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <OpportunityBadge record={entry} />
              <UrgencyBadge urgency={entry.insight.nextAction.urgency} />
              <PmBadge>{entry.insight.service.shortLabel}</PmBadge>
              <PmBadge>{STATUS_META[entry.business.status].label}</PmBadge>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MiniQueueMetric label="Por qué entra hoy" value={entry.queueReason} />
              <MiniQueueMetric label="Qué hacer ahora" value={entry.insight.nextAction.action} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => onSetCurrent(entry)} className="pm-btn pm-btn-primary min-h-0 px-3 py-2 text-xs">
                <Crosshair className="h-4 w-4" />
                {hasActiveSession ? "Trabajar ahora" : "Abrir briefing"}
              </button>

              {hasActiveSession && entry.sessionItemId ? (
                <>
                  <button type="button" onClick={() => onSkip(entry)} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
                    <SkipForward className="h-4 w-4" />
                    Saltar
                  </button>
                  <button type="button" onClick={() => onMoveToEnd(entry)} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
                    <ArrowDownToLine className="h-4 w-4" />
                    Final
                  </button>
                  <button type="button" onClick={() => onPin(entry)} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
                    <Pin className="h-4 w-4" />
                    {entry.pinnedForToday ? "Desfijar" : "Fijar"}
                  </button>
                  <button type="button" onClick={() => onDismiss(entry)} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
                    <CircleOff className="h-4 w-4" />
                    No relevante
                  </button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </PmPanel>
  );
}

function LeadBriefingPanel({
  record,
  suggestion,
  resultDraft,
  lists,
  busy,
  onCopy,
  onChangeDraft,
  onChangeResult,
  onToggleApplySuggestion,
  onQuickPreset,
  onSave,
  onSkipCurrent,
  onMoveCurrentToEnd,
  onPinCurrent,
  onDismissCurrent,
}: {
  record: AttackQueueEntry | null;
  suggestion: AttackNextStepSuggestion | null;
  resultDraft: AttackResultDraft;
  lists: ProspectListRow[];
  busy: boolean;
  onCopy: (value: string, label: string) => void;
  onChangeDraft: (patch: Partial<AttackResultDraft>) => void;
  onChangeResult: (result: AttackResultDraft["result"]) => void;
  onToggleApplySuggestion: (applySuggestion: boolean) => void;
  onQuickPreset: (preset: "call" | "follow_up" | "priority" | "pipeline" | "discard") => void;
  onSave: () => void;
  onSkipCurrent?: () => void;
  onMoveCurrentToEnd?: () => void;
  onPinCurrent?: () => void;
  onDismissCurrent?: () => void;
}) {
  if (!record) {
    return <PmEmpty body="Selecciona un lead de la cola para abrir el briefing operativo." />;
  }

  return (
    <PmPanel elevated className="pm-texture-soft space-y-4 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="pm-kicker">Lead en foco</p>
          <h2 className="pm-title mt-2 text-2xl">{record.business.name}</h2>
          <p className="pm-muted mt-2 text-sm">
            {record.insight.sectorLabel} · {record.insight.cityLabel} · {record.zoneLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <PmBadge tone="amber">Prioridad comercial {record.insight.score}</PmBadge>
          <OpportunityBadge record={record} />
          <UrgencyBadge urgency={record.insight.nextAction.urgency} />
          <PmBadge>{record.insight.service.shortLabel}</PmBadge>
          <PmBadge>{record.insight.estimatedValueLabel}</PmBadge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PmMetric label="Valor estimado" value={formatCurrency(record.insight.estimatedValue)} tone="amber" />
        <PmMetric label="Valor ponderado" value={formatCurrency(record.insight.weightedValue)} tone="violet" />
        <PmMetric label="Último toque" value={formatDaysSince(record.insight.daysSinceTouch)} helper={formatDateTime(record.business.lastInteractionAt)} />
        <PmMetric label="Siguiente paso" value={record.insight.nextAction.urgency} helper={record.insight.nextAction.channel} tone={record.insight.nextAction.urgency === "alta" ? "rose" : "neutral"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <BriefBlock title="Resumen" body={record.insight.executiveSummary} />
          <BriefBlock title="Por qué atacarlo" body={record.insight.attackSummary}>
            <ul className="mt-2 space-y-1 text-sm text-[var(--pm-text-secondary)]">
              {record.whyToday.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </BriefBlock>
          <div className="grid gap-4 xl:grid-cols-2">
            <BriefBlock title="Dolor principal" body={record.insight.painPoint}>
              <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">{record.insight.commercialFocus}</p>
            </BriefBlock>
            <BriefBlock title="Servicio recomendado" body={record.insight.service.label}>
              <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">{record.insight.service.reason}</p>
            </BriefBlock>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <BriefBlock title="Ángulo de entrada" body={record.insight.commercialAngle}>
              <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">CTA sugerida: {record.insight.ctaSuggestion}</p>
            </BriefBlock>
            <BriefBlock title="Qué revisar antes" body={record.insight.reviewChecklist[0] ?? "Validar datos públicos y timing"}>
              <ul className="mt-2 space-y-1 text-sm text-[var(--pm-text-secondary)]">
                {record.insight.reviewChecklist.slice(1).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </BriefBlock>
          </div>

          <BriefBlock title="Qué no decir" body={record.insight.avoidTalkingPoints[0] ?? "No entres con argumentario genérico ni demasiado técnico."}>
            <ul className="mt-2 space-y-1 text-sm text-[var(--pm-text-secondary)]">
              {record.insight.avoidTalkingPoints.slice(1).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </BriefBlock>

          <MessagePanel record={record} onCopy={onCopy} />
          <ObjectionsPanel record={record} />
        </div>

        <div className="space-y-4">
          <QuickActionsPanel
            onCopyInitial={() => onCopy(record.insight.messages.initial, "Mensaje inicial")}
            onCopyFollowUp={() => onCopy(record.insight.messages.followUp1, "Follow-up")}
            onMarkCall={() => onQuickPreset("call")}
            onScheduleFollowUp={() => onQuickPreset("follow_up")}
            onRaisePriority={() => onQuickPreset("priority")}
            onMovePipeline={() => onQuickPreset("pipeline")}
            onDismiss={() => onQuickPreset("discard")}
            onSkipCurrent={onSkipCurrent}
            onMoveCurrentToEnd={onMoveCurrentToEnd}
            onPinCurrent={onPinCurrent}
            onDismissCurrent={onDismissCurrent}
          />
          <ResultPanel
            record={record}
            resultDraft={resultDraft}
            suggestion={suggestion}
            lists={lists}
            busy={busy}
            onChangeDraft={onChangeDraft}
            onChangeResult={onChangeResult}
            onToggleApplySuggestion={onToggleApplySuggestion}
            onSave={onSave}
          />
        </div>
      </div>
    </PmPanel>
  );
}

function SessionControlPanel({
  sourceLabel,
  sessionName,
  progress,
  attackStatus,
  sourceHint,
  queueSize,
  startSize,
  attackBusy,
  hasActiveSession,
  onStartSession,
  onPauseSession,
  onResumeSession,
  onCompleteSession,
}: {
  sourceLabel: string;
  sessionName: string;
  progress: ReturnType<typeof buildAttackSessionProgress>;
  attackStatus: "active" | "paused" | "draft" | "completed" | "archived" | null;
  sourceHint: string;
  queueSize: number;
  startSize: number;
  attackBusy: boolean;
  hasActiveSession: boolean;
  onStartSession: () => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onCompleteSession: () => void;
}) {
  return (
    <PmPanel className="p-5">
      <PmSectionHeader
        eyebrow="Sesión"
        title={sessionName}
        description={sourceHint}
        action={<PmBadge tone={attackStatus === "paused" ? "amber" : "neutral"}>{sourceLabel}</PmBadge>}
      />

      <div className="pm-focus-pane mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--pm-text)]">
              {hasActiveSession ? `${progress.worked + progress.dismissed} de ${progress.total} resueltos` : `${queueSize} leads detectados`}
            </p>
            <p className="mt-1 text-xs text-[var(--pm-text-tertiary)]">
              {hasActiveSession
                ? `${progress.pending} pendientes · ${progress.skipped} saltados`
                : `La sesión arranca con los ${startSize} mejores leads del foco actual.`}
            </p>
          </div>
          <p className="text-2xl font-semibold text-[var(--pm-text)]">{hasActiveSession ? `${progress.percent}%` : startSize}</p>
        </div>

        <div className="mt-4 h-2.5 rounded-full bg-[rgba(255,255,255,0.05)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.82),rgba(255,255,255,0.28))] transition-all"
            style={{ width: `${hasActiveSession ? progress.percent : queueSize === 0 ? 0 : Math.min(100, Math.round((startSize / queueSize) * 100))}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!hasActiveSession ? (
            <button type="button" disabled={attackBusy || startSize === 0} onClick={onStartSession} className="pm-btn pm-btn-primary">
              <Play className="h-4 w-4" />
              Empezar sesión
            </button>
          ) : null}

          {hasActiveSession && attackStatus === "active" ? (
            <button type="button" disabled={attackBusy} onClick={onPauseSession} className="pm-btn pm-btn-secondary">
              <TimerReset className="h-4 w-4" />
              Pausar
            </button>
          ) : null}

          {hasActiveSession && attackStatus === "paused" ? (
            <button type="button" disabled={attackBusy} onClick={onResumeSession} className="pm-btn pm-btn-primary">
              <Play className="h-4 w-4" />
              Reanudar
            </button>
          ) : null}

          {hasActiveSession ? (
            <button type="button" disabled={attackBusy} onClick={onCompleteSession} className="pm-btn pm-btn-secondary">
              <CheckCircle2 className="h-4 w-4" />
              Cerrar sesión
            </button>
          ) : null}
        </div>
      </div>
    </PmPanel>
  );
}

function ResultPanel({
  record,
  resultDraft,
  suggestion,
  lists,
  busy,
  onChangeDraft,
  onChangeResult,
  onToggleApplySuggestion,
  onSave,
}: {
  record: AttackQueueEntry;
  resultDraft: AttackResultDraft;
  suggestion: AttackNextStepSuggestion | null;
  lists: ProspectListRow[];
  busy: boolean;
  onChangeDraft: (patch: Partial<AttackResultDraft>) => void;
  onChangeResult: (result: AttackResultDraft["result"]) => void;
  onToggleApplySuggestion: (value: boolean) => void;
  onSave: () => void;
}) {
  return (
    <PmPanel className="p-4">
      <PmSectionHeader
        eyebrow="Resultado"
        title="Registrar resultado"
        description="Actualiza el lead, deja nota y sigue con el siguiente."
      />

      <div className="mt-4 space-y-4">
        <div className="grid gap-3">
          {ATTACK_RESULT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChangeResult(option.id)}
              className={cn(
                "pm-list-row rounded-[20px] p-3 text-left",
                resultDraft.result === option.id
                  ? "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)]"
                  : "",
              )}
            >
              <p className="text-sm font-medium text-[var(--pm-text)]">{option.label}</p>
              <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{option.description}</p>
            </button>
          ))}
        </div>

        {suggestion ? (
          <div className="pm-list-row rounded-[20px] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="pm-caption uppercase tracking-[0.14em]">Siguiente paso recomendado</p>
                <p className="mt-1 text-sm font-medium text-[var(--pm-text)]">{suggestion.label}</p>
                <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{suggestion.reason}</p>
              </div>
              {suggestion.dueAt ? <PmBadge>{formatDateTime(suggestion.dueAt)}</PmBadge> : null}
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--pm-text-secondary)]">
              <input
                type="checkbox"
                checked={resultDraft.applySuggestion}
                onChange={(event) => onToggleApplySuggestion(event.target.checked)}
                className="h-4 w-4 rounded border border-[var(--pm-border)] bg-[var(--pm-surface)] accent-[var(--pm-primary)]"
              />
              Aplicar esta sugerencia al guardar
            </label>
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-2">
          <label className="space-y-2">
            <span className="pm-caption uppercase tracking-[0.12em]">Nota rápida</span>
            <textarea
              value={resultDraft.noteText}
              onChange={(event) => onChangeDraft({ noteText: event.target.value })}
              className="field min-h-[116px] resize-y"
              placeholder={`Qué pasó con ${record.business.name}, quién respondió y qué toca después.`}
            />
          </label>

          <div className="space-y-3">
            <label className="space-y-2">
              <span className="pm-caption uppercase tracking-[0.12em]">Follow-up</span>
              <input
                type="datetime-local"
                value={resultDraft.followUpAt}
                onChange={(event) => onChangeDraft({ followUpAt: event.target.value })}
                className="field"
              />
            </label>

            <label className="space-y-2">
              <span className="pm-caption uppercase tracking-[0.12em]">Prioridad</span>
              <select
                value={resultDraft.priority}
                onChange={(event) => onChangeDraft({ priority: event.target.value as PriorityLevel | "" })}
                className="field"
              >
                <option value="">Mantener prioridad</option>
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="pm-caption uppercase tracking-[0.12em]">Añadir a campaña</span>
              <select
                value={resultDraft.listId}
                onChange={(event) => onChangeDraft({ listId: event.target.value })}
                className="field"
              >
                <option value="">No añadir ahora</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="pm-list-row inline-flex items-center gap-2 rounded-[18px] px-3 py-3 text-sm text-[var(--pm-text-secondary)]">
            <input
              type="checkbox"
              checked={resultDraft.moveToPipeline}
              onChange={(event) => onChangeDraft({ moveToPipeline: event.target.checked })}
              className="h-4 w-4 rounded border border-[var(--pm-border)] bg-[var(--pm-surface)] accent-[var(--pm-primary)]"
            />
            Mover a pipeline
          </label>
          <label className="pm-list-row inline-flex items-center gap-2 rounded-[18px] px-3 py-3 text-sm text-[var(--pm-text-secondary)]">
            <input
              type="checkbox"
              checked={resultDraft.discard}
              onChange={(event) => onChangeDraft({ discard: event.target.checked })}
              className="h-4 w-4 rounded border border-[var(--pm-border)] bg-[var(--pm-surface)] accent-[var(--pm-primary)]"
            />
            Sacarlo del foco
          </label>
        </div>

        <button type="button" disabled={busy} onClick={onSave} className="pm-btn pm-btn-primary w-full">
          <ArrowUpRight className="h-4 w-4" />
          Registrar resultado
        </button>
      </div>
    </PmPanel>
  );
}

function QuickActionsPanel({
  onCopyInitial,
  onCopyFollowUp,
  onMarkCall,
  onScheduleFollowUp,
  onRaisePriority,
  onMovePipeline,
  onDismiss,
  onSkipCurrent,
  onMoveCurrentToEnd,
  onPinCurrent,
  onDismissCurrent,
}: {
  onCopyInitial: () => void;
  onCopyFollowUp: () => void;
  onMarkCall: () => void;
  onScheduleFollowUp: () => void;
  onRaisePriority: () => void;
  onMovePipeline: () => void;
  onDismiss: () => void;
  onSkipCurrent?: () => void;
  onMoveCurrentToEnd?: () => void;
  onPinCurrent?: () => void;
  onDismissCurrent?: () => void;
}) {
  return (
    <PmPanel className="p-4">
      <PmSectionHeader
        eyebrow="Acciones rápidas"
        title="Operar sin salir del flujo"
        description="Preparar, mover o limpiar el lead actual en un par de clics."
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <QuickButton icon={Copy} label="Copiar mensaje" onClick={onCopyInitial} />
        <QuickButton icon={Copy} label="Copiar follow-up" onClick={onCopyFollowUp} />
        <QuickButton icon={Target} label="Marcar llamada hecha" onClick={onMarkCall} />
        <QuickButton icon={CalendarClock} label="Programar follow-up" onClick={onScheduleFollowUp} />
        <QuickButton icon={Flame} label="Subir prioridad" onClick={onRaisePriority} />
        <QuickButton icon={ArrowRight} label="Mover a pipeline" onClick={onMovePipeline} />
        <QuickButton icon={SkipForward} label="Saltar lead" onClick={onSkipCurrent} disabled={!onSkipCurrent} />
        <QuickButton icon={ArrowDownToLine} label="Mover al final" onClick={onMoveCurrentToEnd} disabled={!onMoveCurrentToEnd} />
        <QuickButton icon={Pin} label="Fijar para hoy" onClick={onPinCurrent} disabled={!onPinCurrent} />
        <QuickButton icon={CircleOff} label="Descartar" onClick={onDismissCurrent ?? onDismiss} />
      </div>
    </PmPanel>
  );
}

function KpiRail({
  kpis,
  progress,
}: {
  kpis: ReturnType<typeof buildAttackSessionKpis>;
  progress: ReturnType<typeof buildAttackSessionProgress>;
}) {
  return (
    <PmPanel className="p-4">
      <PmSectionHeader
        eyebrow="KPIs de ejecución"
        title="Ritmo de la sesión"
        description="Solo métricas que ayudan a mantener foco y empujar la máquina comercial."
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <PmMetric label="Trabajados hoy" value={kpis.workedToday} icon={Crosshair} />
        <PmMetric label="Reuniones potenciales" value={kpis.meetingsUnlocked} icon={Trophy} tone="emerald" />
        <PmMetric label="Descartados" value={kpis.discardedToday} icon={CircleOff} tone="rose" />
        <PmMetric label="Follow-ups" value={kpis.followUpsScheduled} icon={CalendarClock} tone="violet" />
        <PmMetric label="Valor trabajado" value={formatCurrency(kpis.workedValue)} icon={Gauge} tone="amber" />
        <PmMetric label="Avance" value={`${progress.percent}%`} icon={ListFilter} />
      </div>
    </PmPanel>
  );
}

function MessagePanel({
  record,
  onCopy,
}: {
  record: AttackQueueEntry;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <PmPanel className="p-4">
      <PmSectionHeader
        eyebrow="Guion"
        title="Preparar prospección"
        description="Mensaje inicial, seguimientos y CTA listos para ejecutar."
      />

      <div className="mt-4 space-y-3">
        <CopyBlock title="Mensaje inicial" value={record.insight.messages.initial} onCopy={() => onCopy(record.insight.messages.initial, "Mensaje inicial")} />
        <CopyBlock title="Follow-up 1" value={record.insight.messages.followUp1} onCopy={() => onCopy(record.insight.messages.followUp1, "Follow-up 1")} />
        <CopyBlock title="Follow-up 2" value={record.insight.messages.followUp2} onCopy={() => onCopy(record.insight.messages.followUp2, "Follow-up 2")} />
      </div>
    </PmPanel>
  );
}

function ObjectionsPanel({ record }: { record: AttackQueueEntry }) {
  return (
    <PmPanel className="p-4">
      <PmSectionHeader
        eyebrow="Objeciones"
        title="Qué te pueden decir"
        description="Respuesta corta y operativa para no perder el hilo."
      />

      <div className="mt-4 space-y-3">
        {record.insight.objections.map((item) => (
          <article key={item.objection} className="pm-card-soft">
            <p className="text-sm font-medium text-[var(--pm-text)]">{item.objection}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--pm-text-secondary)]">{item.response}</p>
          </article>
        ))}
      </div>
    </PmPanel>
  );
}

function BriefBlock({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section className="pm-card-soft p-4">
      <p className="pm-caption uppercase tracking-[0.14em]">{title}</p>
      <p className="mt-2 text-sm font-medium text-[var(--pm-text)]">{body}</p>
      {children ? <div>{children}</div> : null}
    </section>
  );
}

function CopyBlock({
  title,
  value,
  onCopy,
}: {
  title: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <article className="pm-card-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="pm-caption uppercase tracking-[0.14em]">{title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--pm-text-secondary)]">{value}</p>
        </div>
        <button type="button" onClick={onCopy} className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-xs">
          <Copy className="h-4 w-4" />
          Copiar
        </button>
      </div>
    </article>
  );
}

function QuickButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="pm-btn pm-btn-secondary min-h-0 justify-start px-3 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-55"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="pm-caption block uppercase tracking-[0.12em]">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="field">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniQueueMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="pm-card-soft px-3 py-3">
      <p className="pm-caption uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{value}</p>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="pm-page">
      <PmPanel className="p-6">
        <p className="text-sm text-[var(--pm-text-secondary)]">{text}</p>
      </PmPanel>
    </div>
  );
}
