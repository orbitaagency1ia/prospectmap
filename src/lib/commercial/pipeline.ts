import { PROSPECT_STATUS_ORDER, STATUS_META, type ProspectStatus } from "@/lib/constants";

import type { PipelineSnapshot, PipelineStageSummary, ProspectRecord } from "./types";

const STALE_THRESHOLDS: Partial<Record<ProspectStatus, number>> = {
  sin_contactar: 6,
  intento_contacto: 4,
  contactado: 3,
  reunion_agendada: 2,
  propuesta_enviada: 2,
  negociacion: 2,
};

const PIPELINE_STATUSES: ProspectStatus[] = [
  "intento_contacto",
  "contactado",
  "reunion_agendada",
  "propuesta_enviada",
  "negociacion",
  "ganado",
];

export function resolveAttentionState(input: {
  status: ProspectStatus;
  daysSinceTouch: number | null;
  nextFollowUpAt?: string | null;
  dueToday: boolean;
  needsFollowUp: boolean;
}) {
  const { status, daysSinceTouch, nextFollowUpAt, dueToday, needsFollowUp } = input;
  const nextFollowUpDate = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
  const followUpDue =
    Boolean(nextFollowUpDate && !Number.isNaN(nextFollowUpDate.getTime()) && nextFollowUpDate.getTime() <= Date.now()) ||
    dueToday;

  const staleThreshold = STALE_THRESHOLDS[status];
  const coolingDown =
    typeof staleThreshold === "number" &&
    daysSinceTouch !== null &&
    Number.isFinite(daysSinceTouch) &&
    daysSinceTouch >= staleThreshold &&
    status !== "ganado" &&
    status !== "perdido" &&
    status !== "bloqueado";

  const attentionLabel = followUpDue
    ? "Seguimiento vencido"
    : coolingDown
      ? "Oportunidad enfriandose"
      : needsFollowUp
        ? "Seguimiento en ventana"
        : status === "sin_contactar"
          ? "Apertura pendiente"
          : "Bajo control";

  return {
    followUpDue,
    coolingDown,
    attentionLabel,
  };
}

export function buildPipelineSnapshot(records: ProspectRecord[]): PipelineSnapshot {
  const sorted = [...records].sort((a, b) => {
    if (b.insight.score !== a.insight.score) {
      return b.insight.score - a.insight.score;
    }

    const aDate = a.business.lastInteractionAt ?? a.business.business?.updated_at ?? "";
    const bDate = b.business.lastInteractionAt ?? b.business.business?.updated_at ?? "";
    return aDate < bDate ? 1 : -1;
  });
  const stages: PipelineStageSummary[] = PIPELINE_STATUSES.map((status) => {
    const stageRecords = sorted.filter((record) => record.business.status === status);
    const estimatedValue = stageRecords.reduce((sum, record) => sum + record.insight.estimatedValue, 0);
    const weightedValue = stageRecords.reduce((sum, record) => sum + record.insight.weightedValue, 0);
    const averageScore =
      stageRecords.length > 0
        ? Math.round(stageRecords.reduce((sum, record) => sum + record.insight.score, 0) / stageRecords.length)
        : 0;

    return {
      status,
      label: STATUS_META[status].label,
      count: stageRecords.length,
      estimatedValue,
      weightedValue,
      averageScore,
      records: stageRecords.slice(0, 8),
    };
  });

  const openRecords = sorted.filter(
    (record) => !["perdido", "bloqueado", "ganado"].includes(record.business.status),
  );

  return {
    stages,
    openValue: openRecords.reduce((sum, record) => sum + record.insight.estimatedValue, 0),
    weightedOpenValue: openRecords.reduce((sum, record) => sum + record.insight.weightedValue, 0),
    staleCount: openRecords.filter((record) => record.insight.coolingDown).length,
    followUpDueCount: openRecords.filter((record) => record.insight.followUpDue).length,
    closingSoon: sorted
      .filter((record) => ["reunion_agendada", "propuesta_enviada", "negociacion"].includes(record.business.status))
      .slice(0, 8),
    neglected: sorted.filter((record) => record.insight.followUpDue || record.insight.coolingDown).slice(0, 8),
  };
}

export function getPipelineStatuses() {
  return PIPELINE_STATUSES;
}

export function getFunnelStatuses() {
  return PROSPECT_STATUS_ORDER;
}
