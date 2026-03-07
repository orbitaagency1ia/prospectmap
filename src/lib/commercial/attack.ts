import type { PriorityLevel, ProspectStatus } from "@/lib/constants";
import type { AttackSessionItemRow, ProspectListItemRow, ProspectListRow } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

import type {
  AttackItemStatus,
  AttackNextStepSuggestion,
  AttackQueueEntry,
  AttackQueueFilters,
  AttackResultDraft,
  AttackResultKind,
  AttackResultOption,
  AttackSessionFiltersSnapshot,
  AttackSessionKpis,
  AttackSessionProgress,
  AttackSessionSource,
  ProspectInsight,
  ProspectRecord,
} from "./types";

type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type SessionItemMeta = {
  id: string;
  status: AttackItemStatus;
  pinnedForToday: boolean;
  position: number;
};

const ROW_LABELS = ["Norte", "Centro", "Sur"] as const;
const COL_LABELS = ["Oeste", "Centro", "Este"] as const;

const SESSION_STATUS_WEIGHT: Record<AttackItemStatus, number> = {
  in_progress: 0,
  pending: 1,
  skipped: 2,
  worked: 3,
  dismissed: 4,
};

export const ATTACK_RESULT_OPTIONS: AttackResultOption[] = [
  {
    id: "no_contactado",
    label: "No contactado",
    description: "No llegaste a abrir conversación. Mantén el lead vivo.",
    tone: "neutral",
  },
  {
    id: "contacto_intentado",
    label: "Contacto intentado",
    description: "Se hizo el primer intento y toca insistir con criterio.",
    tone: "amber",
  },
  {
    id: "hablo_con_alguien",
    label: "Habló con alguien",
    description: "Ya hay conversación abierta. Conviene ordenar el siguiente paso.",
    tone: "amber",
  },
  {
    id: "interesado",
    label: "Interesado",
    description: "El lead mostró tracción y merece más prioridad.",
    tone: "emerald",
  },
  {
    id: "reunion_conseguida",
    label: "Reunión conseguida",
    description: "Ya hay siguiente hito comercial real. Esto entra en pipeline activo.",
    tone: "emerald",
  },
  {
    id: "propuesta_pendiente",
    label: "Propuesta pendiente",
    description: "Hay opción real de cierre, pero el siguiente movimiento debe quedar atado.",
    tone: "violet",
  },
  {
    id: "no_encaja",
    label: "No encaja",
    description: "No merece más energía comercial ahora mismo.",
    tone: "rose",
  },
  {
    id: "perdido",
    label: "Perdido",
    description: "La oportunidad cae del pipeline activo.",
    tone: "rose",
  },
  {
    id: "volver_mas_tarde",
    label: "Volver más tarde",
    description: "No toca insistir hoy, pero sí dejarlo calendarizado.",
    tone: "neutral",
  },
];

export const DEFAULT_ATTACK_FILTERS: AttackQueueFilters = {
  city: "all",
  vertical: "all",
  listId: "all",
  service: "all",
  urgency: "all",
  zone: "all",
  territoryOnly: false,
  followUpOnly: false,
};

export const DEFAULT_ATTACK_RESULT_DRAFT: AttackResultDraft = {
  result: "contacto_intentado",
  noteText: "",
  followUpAt: "",
  priority: "",
  listId: "",
  moveToPipeline: false,
  discard: false,
  applySuggestion: true,
};

function clampIndex(value: number) {
  return Math.max(0, Math.min(2, value));
}

function deriveBounds(records: ProspectRecord[]): Bounds | null {
  if (records.length === 0) {
    return null;
  }

  const lats = records.map((record) => record.business.lat);
  const lngs = records.map((record) => record.business.lng);
  const south = Math.min(...lats);
  const north = Math.max(...lats);
  const west = Math.min(...lngs);
  const east = Math.max(...lngs);

  return {
    south,
    north: north === south ? north + 0.01 : north,
    west,
    east: east === west ? east + 0.01 : east,
  };
}

function buildZoneLabel(row: number, col: number) {
  if (ROW_LABELS[row] === "Centro" && COL_LABELS[col] === "Centro") {
    return "Centro";
  }

  if (ROW_LABELS[row] === "Centro") {
    return COL_LABELS[col];
  }

  if (COL_LABELS[col] === "Centro") {
    return ROW_LABELS[row];
  }

  return `${ROW_LABELS[row]} ${COL_LABELS[col]}`;
}

function resolveZone(record: ProspectRecord, bounds: Bounds | null) {
  if (!bounds) {
    return { zoneKey: "0-0", zoneLabel: "Centro" };
  }

  const latSpan = Math.max(bounds.north - bounds.south, 0.0001);
  const lngSpan = Math.max(bounds.east - bounds.west, 0.0001);
  const row = clampIndex(Math.floor(((bounds.north - record.business.lat) / latSpan) * 3));
  const col = clampIndex(Math.floor(((record.business.lng - bounds.west) / lngSpan) * 3));

  return {
    zoneKey: `${row}-${col}`,
    zoneLabel: buildZoneLabel(row, col),
  };
}

function filterByBounds(record: ProspectRecord, bounds: Bounds) {
  return (
    record.business.lat >= bounds.south &&
    record.business.lat <= bounds.north &&
    record.business.lng >= bounds.west &&
    record.business.lng <= bounds.east
  );
}

function getListMembershipMaps(lists: ProspectListRow[], items: ProspectListItemRow[]) {
  const businessListIds = new Map<string, string[]>();
  const businessListNames = new Map<string, string[]>();
  const listNameMap = new Map(lists.map((list) => [list.id, list.name]));

  items.forEach((item) => {
    businessListIds.set(item.business_id, [...(businessListIds.get(item.business_id) ?? []), item.list_id]);
    businessListNames.set(item.business_id, [
      ...(businessListNames.get(item.business_id) ?? []),
      listNameMap.get(item.list_id) ?? "Campaña",
    ]);
  });

  return {
    businessListIds,
    businessListNames,
    listNameMap,
  };
}

function buildWhyToday(entry: ProspectRecord, listNames: string[], source: AttackSessionSource, territoryLabel?: string | null) {
  const reasons: string[] = [];

  if (entry.insight.followUpDue) {
    reasons.push("Follow-up vencido");
  }

  if (entry.insight.coolingDown && !entry.insight.followUpDue) {
    reasons.push("Se está enfriando y necesita movimiento");
  }

  if (entry.business.status === "sin_contactar" && entry.insight.score >= 78) {
    reasons.push("Alta oportunidad sin tocar");
  }

  if (entry.insight.weightedValue >= 2200) {
    reasons.push(`Valor ponderado ${formatCurrency(entry.insight.weightedValue)}`);
  }

  if (entry.insight.nextAction.urgency === "alta") {
    reasons.push("Urgencia alta");
  }

  if (listNames[0]) {
    reasons.push(`Viene de ${listNames[0]}`);
  }

  if (source === "territory" && territoryLabel) {
    reasons.push(`Forma parte de ${territoryLabel}`);
  }

  if (source === "alerts") {
    reasons.push("Llega desde una alerta de oportunidad");
  }

  if (source === "pipeline") {
    reasons.push("Tiene movimiento de cierre pendiente");
  }

  if (source === "priorities") {
    reasons.push("Entró por score y foco comercial");
  }

  if (reasons.length === 0) {
    reasons.push(entry.insight.fitSummary);
  }

  return reasons.slice(0, 4);
}

function buildQueueReason(whyToday: string[]) {
  return whyToday[0] ?? "Encaje claro para atacar hoy";
}

function sortFreshQueue(a: AttackQueueEntry, b: AttackQueueEntry, sourceBusinessKey?: string | null) {
  if (sourceBusinessKey) {
    if (a.business.key === sourceBusinessKey) return -1;
    if (b.business.key === sourceBusinessKey) return 1;
  }

  if (a.insight.followUpDue !== b.insight.followUpDue) {
    return a.insight.followUpDue ? -1 : 1;
  }

  if (a.insight.nextAction.urgency !== b.insight.nextAction.urgency) {
    const urgencyWeight = { alta: 0, media: 1, baja: 2 };
    return urgencyWeight[a.insight.nextAction.urgency] - urgencyWeight[b.insight.nextAction.urgency];
  }

  if (b.insight.score !== a.insight.score) {
    return b.insight.score - a.insight.score;
  }

  if (b.insight.weightedValue !== a.insight.weightedValue) {
    return b.insight.weightedValue - a.insight.weightedValue;
  }

  return a.business.name.localeCompare(b.business.name, "es");
}

function sortSessionQueue(a: AttackQueueEntry, b: AttackQueueEntry) {
  const aPinned = a.pinnedForToday ? 0 : 1;
  const bPinned = b.pinnedForToday ? 0 : 1;
  if (aPinned !== bPinned) {
    return aPinned - bPinned;
  }

  const aStatus = SESSION_STATUS_WEIGHT[a.sessionItemStatus ?? "pending"];
  const bStatus = SESSION_STATUS_WEIGHT[b.sessionItemStatus ?? "pending"];
  if (aStatus !== bStatus) {
    return aStatus - bStatus;
  }

  return (a.queuePosition ?? 0) - (b.queuePosition ?? 0);
}

export function buildDefaultAttackSessionName(source: AttackSessionSource, label?: string | null) {
  switch (source) {
    case "list":
      return label ? `Ataque · ${label}` : "Ataque desde campaña";
    case "territory":
      return label ? `Ataque · ${label}` : "Ataque por territorio";
    case "pipeline":
      return "Ataque · pipeline";
    case "priorities":
      return "Ataque · prioridades";
    case "alerts":
      return "Ataque · alertas";
    case "manual":
      return "Ataque manual";
    default:
      return "Ataque del día";
  }
}

export function buildAttackQueue(
  records: ProspectRecord[],
  options: {
    filters: AttackQueueFilters;
    source?: AttackSessionSource;
    sourceBusinessKey?: string | null;
    territoryBounds?: Bounds | null;
    territoryLabel?: string | null;
    lists?: ProspectListRow[];
    listItems?: ProspectListItemRow[];
    sessionItems?: AttackSessionItemRow[];
  },
): AttackQueueEntry[] {
  const source = options.source ?? "daily_queue";
  const territoryBounds = options.territoryBounds ?? null;
  const savedRecords = records.filter((record) => Boolean(record.business.business?.id));
  const sessionBusinessIds = new Set((options.sessionItems ?? []).map((item) => item.business_id));
  const recordsInScope =
    sessionBusinessIds.size > 0
      ? savedRecords.filter((record) => {
          const businessId = record.business.business?.id;
          return businessId ? sessionBusinessIds.has(businessId) : false;
        })
      : savedRecords;
  const territoryScoped = territoryBounds
    ? recordsInScope.filter((record) => filterByBounds(record, territoryBounds))
    : recordsInScope;
  const bounds = territoryBounds ?? deriveBounds(territoryScoped);
  const { businessListIds, businessListNames } = getListMembershipMaps(options.lists ?? [], options.listItems ?? []);
  const sessionMap = new Map<string, SessionItemMeta>();

  (options.sessionItems ?? []).forEach((item) => {
    sessionMap.set(item.business_id, {
      id: item.id,
      status: item.status,
      pinnedForToday: item.pinned_for_today,
      position: item.position,
    });
  });

  const base = territoryScoped
    .map<AttackQueueEntry | null>((record) => {
      const businessId = record.business.business?.id;
      if (!businessId) {
        return null;
      }

      const listIds = businessListIds.get(businessId) ?? [];
      const listNames = businessListNames.get(businessId) ?? [];
      const { zoneKey, zoneLabel } = resolveZone(record, bounds);
      const whyToday = buildWhyToday(record, listNames, source, options.territoryLabel);
      const sessionMeta = sessionMap.get(businessId);

      return {
        ...record,
        businessId,
        zoneKey,
        zoneLabel,
        queueReason: buildQueueReason(whyToday),
        whyToday,
        listIds,
        listNames,
        sessionItemId: sessionMeta?.id,
        sessionItemStatus: sessionMeta?.status,
        pinnedForToday: sessionMeta?.pinnedForToday ?? false,
        queuePosition: sessionMeta?.position,
      };
    })
    .filter((record): record is AttackQueueEntry => Boolean(record));

  const filtered = base.filter((record) => {
    if (options.filters.city !== "all" && record.insight.cityLabel !== options.filters.city) {
      return false;
    }

    if (options.filters.vertical !== "all" && record.insight.effectiveVertical !== options.filters.vertical) {
      return false;
    }

    if (options.filters.service !== "all" && record.insight.service.service !== options.filters.service) {
      return false;
    }

    if (options.filters.urgency !== "all" && record.insight.nextAction.urgency !== options.filters.urgency) {
      return false;
    }

    if (options.filters.zone !== "all" && record.zoneKey !== options.filters.zone) {
      return false;
    }

    if (options.filters.followUpOnly && !record.insight.followUpDue) {
      return false;
    }

    if (options.filters.listId !== "all" && !record.listIds.includes(options.filters.listId)) {
      return false;
    }

    return true;
  });

  const sorted = options.sessionItems?.length
    ? [...filtered].sort(sortSessionQueue)
    : [...filtered].sort((a, b) => sortFreshQueue(a, b, options.sourceBusinessKey));

  return sorted;
}

export function buildAttackSessionProgress(entries: AttackQueueEntry[]): AttackSessionProgress {
  const total = entries.length;
  const worked = entries.filter((entry) => entry.sessionItemStatus === "worked").length;
  const skipped = entries.filter((entry) => entry.sessionItemStatus === "skipped").length;
  const dismissed = entries.filter((entry) => entry.sessionItemStatus === "dismissed").length;
  const pending = entries.filter((entry) => !entry.sessionItemStatus || entry.sessionItemStatus === "pending" || entry.sessionItemStatus === "in_progress").length;

  return {
    total,
    worked,
    skipped,
    dismissed,
    pending,
    percent: total === 0 ? 0 : Math.round(((worked + dismissed) / total) * 100),
  };
}

export function buildAttackSessionKpis(options: {
  entries: AttackQueueEntry[];
  resultsToday: Array<{ result: AttackResultKind; follow_up_at: string | null; created_at: string }>;
  startedAt?: string | null;
}): AttackSessionKpis {
  const workedEntries = options.entries.filter((entry) => entry.sessionItemStatus === "worked");
  const progress = buildAttackSessionProgress(options.entries);
  const meetingsUnlocked = options.resultsToday.filter((item) => item.result === "reunion_conseguida" || item.result === "interesado").length;
  const discardedToday = options.resultsToday.filter((item) => item.result === "no_encaja" || item.result === "perdido").length;
  const followUpsScheduled = options.resultsToday.filter((item) => Boolean(item.follow_up_at)).length;
  const workedValue = workedEntries.reduce((sum, entry) => sum + entry.insight.weightedValue, 0);

  let averagePaceMinutes: number | null = null;
  if (options.startedAt && workedEntries.length > 0) {
    const minutes = (Date.now() - new Date(options.startedAt).getTime()) / (1000 * 60);
    averagePaceMinutes = Math.max(1, Math.round(minutes / workedEntries.length));
  }

  return {
    workedToday: workedEntries.length,
    followUpsScheduled,
    meetingsUnlocked,
    discardedToday,
    workedValue,
    sessionAdvance: progress.percent,
    averagePaceMinutes,
  };
}

export function getCurrentAttackLead(entries: AttackQueueEntry[]) {
  return (
    entries.find((entry) => entry.sessionItemStatus === "in_progress") ??
    entries.find((entry) => !entry.sessionItemStatus || entry.sessionItemStatus === "pending") ??
    entries[0] ??
    null
  );
}

export function buildAttackNextStepSuggestion(args: {
  result: AttackResultKind;
  insight: ProspectInsight;
  currentStatus: ProspectStatus;
}): AttackNextStepSuggestion {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const twoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const fourDays = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  switch (args.result) {
    case "no_contactado":
      return {
        label: "Reintentar mañana",
        reason: "Todavía no hubo contacto real. Conviene volver con rapidez antes de que pierda timing.",
        dueAt: tomorrow,
        nextStatus: args.currentStatus === "sin_contactar" ? "intento_contacto" : args.currentStatus,
      };
    case "contacto_intentado":
      return {
        label: "Follow-up en 2 días",
        reason: "Ya hay intento registrado. Mejor calendarizar el siguiente toque con continuidad.",
        dueAt: twoDays,
        nextStatus: "intento_contacto",
      };
    case "hablo_con_alguien":
      return {
        label: "Subir prioridad y volver en 2 días",
        reason: "Ya hubo conversación. Mantén la inercia con seguimiento corto.",
        dueAt: twoDays,
        nextStatus: "contactado",
        nextPriority: "alta",
      };
    case "interesado":
      return {
        label: "Mover a pipeline y preparar siguiente paso",
        reason: "Hay señal comercial positiva. Debe pasar a prioridad alta con seguimiento claro.",
        dueAt: twoDays,
        nextStatus: "contactado",
        nextPriority: "alta",
        moveToPipeline: true,
      };
    case "reunion_conseguida":
      return {
        label: "Mover a pipeline activo",
        reason: "La oportunidad ya tiene hito de cierre. Conviene tratarla como oportunidad viva.",
        dueAt: twoDays,
        nextStatus: "reunion_agendada",
        nextPriority: "alta",
        moveToPipeline: true,
      };
    case "propuesta_pendiente":
      return {
        label: "Seguir propuesta en 4 días",
        reason: "La conversación ya está madura. Lo importante es no dejar que la propuesta se enfríe.",
        dueAt: fourDays,
        nextStatus: "propuesta_enviada",
        nextPriority: "alta",
        moveToPipeline: true,
      };
    case "no_encaja":
      return {
        label: "Archivarlo",
        reason: "No merece más energía comercial ahora mismo.",
        dueAt: null,
        nextStatus: "bloqueado",
        archive: true,
      };
    case "perdido":
      return {
        label: "Cerrar y sacar del foco",
        reason: "La oportunidad cae del pipeline y deja espacio al siguiente lead.",
        dueAt: null,
        nextStatus: "perdido",
        archive: true,
      };
    case "volver_mas_tarde":
      return {
        label: "Revisar en una semana",
        reason: "No conviene empujar hoy, pero sí dejarlo calendarizado.",
        dueAt: sevenDays,
        nextStatus: args.currentStatus === "sin_contactar" ? "intento_contacto" : args.currentStatus,
      };
    default:
      return {
        label: args.insight.nextAction.action,
        reason: args.insight.nextAction.reason,
        dueAt: args.insight.followUpAt,
      };
  }
}

export function buildBusinessUpdateFromAttackResult(args: {
  result: AttackResultKind;
  currentStatus: ProspectStatus;
  currentPriority: PriorityLevel | null;
  followUpAt?: string | null;
  overridePriority?: PriorityLevel | null;
  suggestion?: AttackNextStepSuggestion | null;
}): {
  prospect_status?: ProspectStatus;
  priority?: PriorityLevel;
  last_contact_at?: string | null;
  next_follow_up_at?: string | null;
} {
  const now = new Date().toISOString();
  const followUpAt = args.followUpAt ?? args.suggestion?.dueAt ?? null;
  const priority = args.overridePriority ?? args.suggestion?.nextPriority ?? args.currentPriority ?? "media";

  switch (args.result) {
    case "no_contactado":
      return {
        prospect_status: args.currentStatus === "sin_contactar" ? "intento_contacto" : args.currentStatus,
        priority,
        next_follow_up_at: followUpAt,
      };
    case "contacto_intentado":
      return {
        prospect_status: "intento_contacto",
        priority,
        last_contact_at: now,
        next_follow_up_at: followUpAt,
      };
    case "hablo_con_alguien":
      return {
        prospect_status: "contactado",
        priority,
        last_contact_at: now,
        next_follow_up_at: followUpAt,
      };
    case "interesado":
      return {
        prospect_status: "contactado",
        priority: priority === "baja" ? "alta" : priority,
        last_contact_at: now,
        next_follow_up_at: followUpAt,
      };
    case "reunion_conseguida":
      return {
        prospect_status: "reunion_agendada",
        priority: "alta",
        last_contact_at: now,
        next_follow_up_at: followUpAt,
      };
    case "propuesta_pendiente":
      return {
        prospect_status: "propuesta_enviada",
        priority: "alta",
        last_contact_at: now,
        next_follow_up_at: followUpAt,
      };
    case "no_encaja":
      return {
        prospect_status: "bloqueado",
        priority,
        last_contact_at: now,
        next_follow_up_at: null,
      };
    case "perdido":
      return {
        prospect_status: "perdido",
        priority,
        last_contact_at: now,
        next_follow_up_at: null,
      };
    case "volver_mas_tarde":
      return {
        prospect_status: args.currentStatus === "sin_contactar" ? "intento_contacto" : args.currentStatus,
        priority,
        next_follow_up_at: followUpAt,
      };
    default:
      return {
        priority,
        next_follow_up_at: followUpAt,
      };
  }
}

export function buildAttackSessionFiltersSnapshot(filters: AttackQueueFilters, extras?: {
  territoryLabel?: string | null;
  sourceBusinessKey?: string | null;
}): AttackSessionFiltersSnapshot {
  return {
    city: filters.city,
    vertical: filters.vertical,
    listId: filters.listId,
    service: filters.service,
    urgency: filters.urgency,
    zone: filters.zone,
    territoryLabel: extras?.territoryLabel ?? undefined,
    sourceBusinessKey: extras?.sourceBusinessKey ?? undefined,
  };
}
