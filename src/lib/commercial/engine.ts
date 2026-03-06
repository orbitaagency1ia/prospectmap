import { STATUS_RANK } from "@/lib/constants";
import type { CombinedBusiness } from "@/lib/types";

import { buildDefaultAccountCommercialProfile, parseAccountCommercialProfileRow } from "./account-profile";
import { parseAccountSettingsRow } from "./account-settings";
import { buildDemoBadges, buildSuggestedMessages } from "./messaging";
import { buildObjectionResponses } from "./objections";
import { resolveAttentionState, buildPipelineSnapshot } from "./pipeline";
import { buildCommercialFocus, buildNextBestAction, buildServiceRecommendation, detectPainPoint } from "./recommendations";
import {
  buildAvoidTalkingPoints,
  buildCommercialAngle,
  buildCtaSuggestion,
  buildExecutiveSummary,
  buildFitSignals,
  buildMissingData,
  buildReviewChecklist,
  buildRiskSignals,
} from "./report";
import { calculateScoreLayer, resolveSectorPattern } from "./scoring";
import { estimateCommercialValue } from "./valuation";
import { getVerticalLabel, inferMarketVerticalId } from "./verticals";
import type {
  AccountCommercialProfile,
  AccountCommercialSettings,
  CommandCenterSummary,
  OpportunityTier,
  OrbitaService,
  PipelineSnapshot,
  ProspectInsight,
  ProspectRecord,
  TodayBuckets,
  VerticalId,
} from "./types";

export const OPPORTUNITY_META: Record<
  OpportunityTier,
  {
    label: string;
    badgeClass: string;
  }
> = {
  alta_oportunidad: {
    label: "Alta oportunidad",
    badgeClass: "border border-emerald-500/70 bg-emerald-500/15 text-emerald-200",
  },
  media_oportunidad: {
    label: "Media oportunidad",
    badgeClass: "border border-amber-500/70 bg-amber-500/15 text-amber-200",
  },
  baja_oportunidad: {
    label: "Baja oportunidad",
    badgeClass: "border border-slate-600 bg-slate-700/50 text-slate-200",
  },
};

export function getOpportunityTier(score: number): OpportunityTier {
  if (score >= 75) return "alta_oportunidad";
  if (score >= 50) return "media_oportunidad";
  return "baja_oportunidad";
}

export function buildProspectInsight(input: {
  business: CombinedBusiness;
  settings: AccountCommercialSettings;
  accountProfile?: AccountCommercialProfile;
  fallbackCity?: string;
}): ProspectInsight {
  const { business, settings, fallbackCity } = input;
  const accountProfile = input.accountProfile ?? buildDefaultAccountCommercialProfile();
  const marketVertical = inferMarketVerticalId(business);
  const effectiveVertical = (business.business?.vertical_override as VerticalId | null) ?? settings.vertical;
  const verticalSource = business.business?.vertical_override ? "override" : "account";
  const sectorPattern = resolveSectorPattern(business, effectiveVertical, marketVertical);
  const scoring = calculateScoreLayer({
    business,
    scoringConfig: settings.scoringConfig,
    effectiveVertical,
    marketVertical,
    sectorPattern,
    accountProfile,
    fallbackCity,
  });
  const painPoint = detectPainPoint(business, effectiveVertical, sectorPattern, accountProfile);
  const commercialFocus = buildCommercialFocus(effectiveVertical, settings.commercialPreferences, painPoint, accountProfile);
  const service = buildServiceRecommendation({
    business,
    effectiveVertical,
    marketVertical,
    sectorPattern,
    score: scoring.score,
    painPoint,
    accountProfile,
  });
  const nextAction = buildNextBestAction({
    business,
    service,
    followUpUrgencyFactor: scoring.urgencyFactor,
    preferences: settings.commercialPreferences,
    accountProfile,
  });
  const messages = buildSuggestedMessages({
    business,
    effectiveVertical,
    service,
    painPoint,
    preferences: settings.commercialPreferences,
    accountProfile,
  });
  const objections = buildObjectionResponses(effectiveVertical, service.service, accountProfile);
  const demoBadges = buildDemoBadges({
    business,
    service,
    nextAction,
    score: scoring.score,
    effectiveVertical,
  });
  const tier = getOpportunityTier(scoring.score);
  const fitSignals = buildFitSignals({
    business,
    accountProfile,
    service,
    effectiveVertical,
  });
  const riskSignals = buildRiskSignals({
    business,
    objections,
  });
  const missingData = buildMissingData(business);
  const reviewChecklist = buildReviewChecklist({
    business,
    accountProfile,
    service,
  });
  const avoidTalkingPoints = buildAvoidTalkingPoints(accountProfile, objections);
  const commercialAngle = buildCommercialAngle({
    accountProfile,
    service,
    painPoint,
  });
  const ctaSuggestion = buildCtaSuggestion(accountProfile, nextAction);
  const valuation = estimateCommercialValue({
    business,
    accountProfile,
    service,
    score: scoring.score,
  });
  const executiveSummary = buildExecutiveSummary({
    business,
    service,
    nextAction,
    painPoint,
    accountProfile,
  });
  const fitSummary =
    fitSignals[0] ??
    `Encaje ${service.fitLabel} basado en vertical, oferta y nivel de oportunidad actual.`;
  const attention = resolveAttentionState({
    status: business.status,
    daysSinceTouch: scoring.daysSince,
    nextFollowUpAt: business.business?.next_follow_up_at,
    dueToday: scoring.dueToday,
    needsFollowUp: scoring.needsFollowUp,
  });
  const attackSummary = `Motivo principal: ${fitSummary} Valor estimado ${valuation.estimatedValueLabel.toLowerCase()} y entrada por ${service.shortLabel.toLowerCase()}.`;
  const riskSummary =
    riskSignals[0] ??
    missingData[0] ??
    "Sin riesgo dominante detectado; revisar el negocio antes del primer toque.";

  return {
    score: scoring.score,
    tier,
    tierLabel: OPPORTUNITY_META[tier].label,
    effectiveVertical,
    effectiveVerticalLabel: getVerticalLabel(effectiveVertical),
    marketVertical,
    marketVerticalLabel: getVerticalLabel(marketVertical),
    verticalSource,
    painPoint,
    commercialFocus,
    service,
    nextAction,
    messages,
    objections,
    breakdown: scoring.breakdown,
    executiveSummary,
    fitSummary,
    fitSignals,
    riskSignals,
    missingData,
    reviewChecklist,
    avoidTalkingPoints,
    commercialAngle,
    ctaSuggestion,
    attackSummary,
    riskSummary,
    sectorLabel: scoring.sectorLabel,
    cityLabel: scoring.cityLabel,
    estimatedValue: valuation.estimatedValue,
    weightedValue: valuation.weightedValue,
    estimatedValueLabel: valuation.estimatedValueLabel,
    valueBand: valuation.valueBand,
    closeProbability: valuation.closeProbability,
    daysSinceTouch: scoring.daysSince,
    followUpAt: business.business?.next_follow_up_at ?? null,
    followUpDue: attention.followUpDue,
    coolingDown: attention.coolingDown,
    attentionLabel: attention.attentionLabel,
    isHot: scoring.isHot,
    needsFollowUp: scoring.needsFollowUp,
    dueToday: scoring.dueToday,
    demoBadges,
  };
}

export function buildProspectRecords(
  businesses: CombinedBusiness[],
  settings: AccountCommercialSettings,
  accountProfile?: AccountCommercialProfile,
  fallbackCity?: string,
) {
  return businesses.map((business) => ({
    business,
    insight: buildProspectInsight({
      business,
      settings,
      accountProfile,
      fallbackCity,
    }),
  }));
}

export function sortProspectRecordsByScore(records: ProspectRecord[]) {
  return [...records].sort((a, b) => {
    if (b.insight.score !== a.insight.score) {
      return b.insight.score - a.insight.score;
    }

    const aDate = a.business.lastInteractionAt ?? a.business.business?.updated_at ?? "";
    const bDate = b.business.lastInteractionAt ?? b.business.business?.updated_at ?? "";
    return aDate < bDate ? 1 : -1;
  });
}

export function buildTodayBuckets(records: ProspectRecord[]): TodayBuckets {
  const sorted = sortProspectRecordsByScore(records);
  const prioritizedToday = sorted
    .filter((record) => record.insight.dueToday || record.insight.score >= 72)
    .slice(0, 8);
  const followUpsPending = sorted.filter((record) => record.insight.needsFollowUp).slice(0, 8);
  const hotLeads = sorted.filter((record) => record.insight.isHot).slice(0, 8);
  const highPotentialUntouched = sorted
    .filter((record) => record.business.status === "sin_contactar" && record.insight.score >= 68)
    .slice(0, 8);

  return {
    prioritizedToday,
    followUpsPending,
    hotLeads,
    highPotentialUntouched,
  };
}

export function filterByBounds(
  record: ProspectRecord,
  bounds: { south: number; west: number; north: number; east: number },
) {
  return (
    record.business.lat >= bounds.south &&
    record.business.lat <= bounds.north &&
    record.business.lng >= bounds.west &&
    record.business.lng <= bounds.east
  );
}

export function buildCityOptions(records: ProspectRecord[]) {
  return Array.from(new Set(records.map((record) => record.insight.cityLabel))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function buildSectorOptions(records: ProspectRecord[]) {
  return Array.from(new Set(records.map((record) => record.insight.sectorLabel))).sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}

export function buildCommandCenterSummary(records: ProspectRecord[], accountVertical: VerticalId): CommandCenterSummary {
  const sorted = sortProspectRecordsByScore(records);
  const priorityPool = sorted.filter((record) => record.insight.score >= 50);
  const serviceMap = new Map<OrbitaService, { service: OrbitaService; label: string; value: number }>();
  const marketMap = new Map<string, { vertical: VerticalId; label: string; value: number }>();
  const sectorMap = new Map<string, number>();

  priorityPool.forEach((record) => {
    const serviceKey = record.insight.service.service;
    serviceMap.set(serviceKey, {
      service: serviceKey,
      label: record.insight.service.shortLabel,
      value: (serviceMap.get(serviceKey)?.value ?? 0) + 1,
    });

    const marketKey = record.insight.marketVertical;
    marketMap.set(marketKey, {
      vertical: marketKey,
      label: record.insight.marketVerticalLabel,
      value: (marketMap.get(marketKey)?.value ?? 0) + 1,
    });

    sectorMap.set(record.insight.sectorLabel, (sectorMap.get(record.insight.sectorLabel) ?? 0) + 1);
  });

  const serviceDistribution = Array.from(serviceMap.values()).sort((a, b) => b.value - a.value);
  const marketVerticalDistribution = Array.from(marketMap.values()).sort((a, b) => b.value - a.value);
  const sectorDistribution = Array.from(sectorMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const pipelineMoments = [
    {
      label: "Sin tocar",
      value: records.filter((record) => record.business.status === "sin_contactar").length,
    },
    {
      label: "Activos",
      value: records.filter(
        (record) =>
          STATUS_RANK[record.business.status] >= STATUS_RANK.intento_contacto &&
          STATUS_RANK[record.business.status] < STATUS_RANK.reunion_agendada,
      ).length,
    },
    {
      label: "Avanzados",
      value: records.filter(
        (record) =>
          STATUS_RANK[record.business.status] >= STATUS_RANK.reunion_agendada &&
          STATUS_RANK[record.business.status] < STATUS_RANK.ganado,
      ).length,
    },
    {
      label: "No viables",
      value: records.filter(
        (record) => record.business.status === "perdido" || record.business.status === "bloqueado",
      ).length,
    },
  ];

  const prioritizedCount = records.filter((record) => record.insight.score >= 72 || record.insight.dueToday).length;
  const hotCount = records.filter((record) => record.insight.isHot).length;
  const followUpCount = records.filter((record) => record.insight.needsFollowUp || record.insight.followUpDue).length;
  const untouchedCount = records.filter(
    (record) => record.business.status === "sin_contactar" && record.insight.score >= 68,
  ).length;
  const staleCount = records.filter((record) => record.insight.coolingDown).length;
  const estimatedValueTotal = records.reduce((sum, record) => sum + record.insight.estimatedValue, 0);
  const weightedValueTotal = records.reduce((sum, record) => sum + record.insight.weightedValue, 0);

  const topService = serviceDistribution[0]?.label ?? "Sin señal dominante";
  const topVertical = marketVerticalDistribution[0]?.label ?? getVerticalLabel(accountVertical);
  const topSector = sectorDistribution[0]?.label ?? "sin sector dominante";

  return {
    prioritizedCount,
    hotCount,
    followUpCount,
    untouchedCount,
    staleCount,
    estimatedValueTotal,
    weightedValueTotal,
    serviceDistribution,
    marketVerticalDistribution,
    sectorDistribution,
    pipelineMoments,
    actionSummary: [
      `${followUpCount} leads piden seguimiento antes de que se enfrien.`,
      `${staleCount} oportunidades estan perdiendo timing y requieren un toque hoy.`,
      `${serviceDistribution[0]?.value ?? 0} oportunidades apuntan sobre todo a ${topService.toLowerCase()}.`,
      `${marketVerticalDistribution[0]?.value ?? 0} oportunidades fuertes se concentran en ${topVertical.toLowerCase()} / ${topSector.toLowerCase()}.`,
    ],
  };
}

export function buildPipelineOverview(records: ProspectRecord[]): PipelineSnapshot {
  return buildPipelineSnapshot(records);
}

export function normalizeRankingFilters() {
  return {
    city: "all",
    sector: "all",
    status: "all",
    priority: "all",
  } as const;
}

export { parseAccountSettingsRow };
export { parseAccountCommercialProfileRow };
