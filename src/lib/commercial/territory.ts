import { STATUS_RANK } from "@/lib/constants";

import type { ConquestSnapshot, ConquestZoneSummary, ProspectRecord } from "./types";

type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const ROW_LABELS = ["Norte", "Centro", "Sur"] as const;
const COL_LABELS = ["Oeste", "Centro", "Este"] as const;

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

function isWorked(record: ProspectRecord) {
  return record.business.status !== "sin_contactar" || record.business.worked;
}

function isOpen(record: ProspectRecord) {
  return (
    STATUS_RANK[record.business.status] >= STATUS_RANK.intento_contacto &&
    STATUS_RANK[record.business.status] < STATUS_RANK.ganado
  );
}

function isHighPotential(record: ProspectRecord) {
  return record.insight.score >= 72;
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

export function buildConquestSnapshot(
  records: ProspectRecord[],
  options?: {
    scopeLabel?: string;
    bounds?: Bounds | null;
  },
): ConquestSnapshot {
  if (records.length === 0) {
    return {
      scopeLabel: options?.scopeLabel ?? "Territorio actual",
      totalCount: 0,
      workedCount: 0,
      untouchedCount: 0,
      openCount: 0,
      hotLeadCount: 0,
      coveragePercent: 0,
      weightedValue: 0,
      estimatedValue: 0,
      hotZones: [],
      underusedZones: [],
      liveZones: [],
      coverageNarrative: [
        "Todavía no hay suficiente territorio trabajado para sacar conclusiones.",
      ],
    };
  }

  const bounds = options?.bounds ?? deriveBounds(records);
  if (!bounds) {
    return {
      scopeLabel: options?.scopeLabel ?? "Territorio actual",
      totalCount: records.length,
      workedCount: 0,
      untouchedCount: records.length,
      openCount: 0,
      hotLeadCount: 0,
      coveragePercent: 0,
      weightedValue: 0,
      estimatedValue: 0,
      hotZones: [],
      underusedZones: [],
      liveZones: [],
      coverageNarrative: [],
    };
  }

  const latSpan = Math.max(bounds.north - bounds.south, 0.0001);
  const lngSpan = Math.max(bounds.east - bounds.west, 0.0001);
  const zoneMap = new Map<string, ConquestZoneSummary>();
  const topScoreMap = new Map<string, number>();

  records.forEach((record) => {
    const row = clampIndex(Math.floor(((bounds.north - record.business.lat) / latSpan) * 3));
    const col = clampIndex(Math.floor(((record.business.lng - bounds.west) / lngSpan) * 3));
    const key = `${row}-${col}`;
    const current =
      zoneMap.get(key) ??
      ({
        key,
        label: buildZoneLabel(row, col),
        totalCount: 0,
        workedCount: 0,
        untouchedCount: 0,
        openCount: 0,
        highPotentialCount: 0,
        hotLeadCount: 0,
        weightedValue: 0,
        averageScore: 0,
        coveragePercent: 0,
      } satisfies ConquestZoneSummary);

    current.totalCount += 1;
    current.workedCount += isWorked(record) ? 1 : 0;
    current.untouchedCount += record.business.status === "sin_contactar" ? 1 : 0;
    current.openCount += isOpen(record) ? 1 : 0;
    current.highPotentialCount += isHighPotential(record) ? 1 : 0;
    current.hotLeadCount += record.insight.isHot ? 1 : 0;
    current.weightedValue += record.insight.weightedValue;
    current.averageScore += record.insight.score;

    const topScore = topScoreMap.get(key) ?? -1;
    if (!current.topBusinessKey || record.insight.score > topScore) {
      current.topBusinessKey = record.business.key;
      current.topBusinessName = record.business.name;
      topScoreMap.set(key, record.insight.score);
    }

    zoneMap.set(key, current);
  });

  const zones = Array.from(zoneMap.values()).map((zone) => ({
    ...zone,
    averageScore: Number((zone.averageScore / Math.max(zone.totalCount, 1)).toFixed(1)),
    coveragePercent: Math.round((zone.workedCount / Math.max(zone.totalCount, 1)) * 100),
  }));

  const hotZones = [...zones]
    .sort((a, b) => {
      const aScore = a.averageScore * 2 + a.highPotentialCount * 18 + a.openCount * 12 + a.hotLeadCount * 14;
      const bScore = b.averageScore * 2 + b.highPotentialCount * 18 + b.openCount * 12 + b.hotLeadCount * 14;
      return bScore - aScore;
    })
    .filter((zone) => zone.highPotentialCount > 0 || zone.hotLeadCount > 0 || zone.openCount > 1)
    .slice(0, 3);

  const underusedZones = [...zones]
    .sort((a, b) => {
      const aScore = a.untouchedCount * 18 + a.highPotentialCount * 16 + a.weightedValue / 600;
      const bScore = b.untouchedCount * 18 + b.highPotentialCount * 16 + b.weightedValue / 600;
      return bScore - aScore;
    })
    .filter((zone) => zone.untouchedCount > 0)
    .slice(0, 3);

  const liveZones = [...zones]
    .sort((a, b) => b.weightedValue - a.weightedValue)
    .filter((zone) => zone.openCount > 0 || zone.weightedValue > 0)
    .slice(0, 4);

  const workedCount = records.filter(isWorked).length;
  const untouchedCount = records.filter((record) => record.business.status === "sin_contactar").length;
  const openCount = records.filter(isOpen).length;
  const hotLeadCount = records.filter((record) => record.insight.isHot).length;
  const weightedValue = records.reduce((sum, record) => sum + record.insight.weightedValue, 0);
  const estimatedValue = records.reduce((sum, record) => sum + record.insight.estimatedValue, 0);
  const coveragePercent = Math.round((workedCount / Math.max(records.length, 1)) * 100);

  return {
    scopeLabel: options?.scopeLabel ?? "Territorio actual",
    totalCount: records.length,
    workedCount,
    untouchedCount,
    openCount,
    hotLeadCount,
    coveragePercent,
    weightedValue,
    estimatedValue,
    hotZones,
    underusedZones,
    liveZones,
    coverageNarrative: [
      `${coveragePercent}% del territorio ya tiene algún movimiento comercial.`,
      `${untouchedCount} cuentas siguen sin tocar y ${openCount} están activas en pipeline.`,
      hotZones[0]
        ? `${hotZones[0].label} concentra la señal más fuerte ahora mismo.`
        : "Todavía no hay una zona caliente dominante.",
    ],
  };
}
