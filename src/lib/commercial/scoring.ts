import { STATUS_RANK, type PriorityLevel, type ProspectStatus } from "@/lib/constants";
import type { CombinedBusiness } from "@/lib/types";
import { clamp, normalizeText } from "@/lib/utils";

import { getVerticalConfig, getVerticalLabel } from "./verticals";
import type { ScoreBreakdownItem, ScoringConfig, SectorPattern, VerticalId } from "./types";

const BASE_SCORE = 12;
const DEAD_LEAD_PENALTY = 34;

export function getBusinessText(business: CombinedBusiness) {
  return normalizeText([business.name, business.category, business.city].filter(Boolean).join(" "));
}

export function getCityLabel(business: CombinedBusiness, fallbackCity?: string) {
  return business.city?.trim() || fallbackCity?.trim() || "Sin ciudad";
}

export function resolveSectorPattern(
  business: CombinedBusiness,
  effectiveVertical: VerticalId,
  marketVertical: VerticalId,
): SectorPattern | null {
  const text = getBusinessText(business);
  const patterns = [
    ...getVerticalConfig(effectiveVertical).sectorPatterns,
    ...getVerticalConfig(marketVertical).sectorPatterns,
  ];

  const match = patterns.find((pattern) =>
    pattern.keywords.some((keyword) => text.includes(normalizeText(keyword))),
  );

  return match ?? null;
}

function getDaysSince(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function getPriorityFactor(priority: PriorityLevel | null) {
  if (priority === "alta") return 1;
  if (priority === "media") return 0.62;
  if (priority === "baja") return 0.24;
  return 0.36;
}

function getMomentumFactor(status: ProspectStatus) {
  const factors: Record<ProspectStatus, number> = {
    sin_contactar: 0.34,
    intento_contacto: 0.48,
    contactado: 0.66,
    reunion_agendada: 0.84,
    propuesta_enviada: 0.9,
    negociacion: 1,
    ganado: 0.22,
    perdido: 0.05,
    bloqueado: 0,
  };

  return factors[status];
}

function getContactabilityFactor(business: CombinedBusiness) {
  const businessRow = business.business;
  const contactSignals = [
    businessRow?.direct_phone,
    businessRow?.direct_email,
    businessRow?.phone ?? business.overpass?.phone,
    businessRow?.email ?? business.overpass?.email,
    businessRow?.website ?? business.overpass?.website,
  ].filter(Boolean).length;

  if (contactSignals >= 4) return 1;
  if (contactSignals === 3) return 0.84;
  if (contactSignals === 2) return 0.64;
  if (contactSignals === 1) return 0.38;
  return 0.14;
}

function getWebsiteGapFactor(business: CombinedBusiness) {
  const website = business.business?.website ?? business.overpass?.website;
  const openingHours = business.business?.opening_hours ?? business.overpass?.opening_hours;

  if (!website && openingHours) return 1;
  if (!website) return 0.82;
  if (website && !openingHours) return 0.48;
  return 0.22;
}

function getDecisionMakerFactor(business: CombinedBusiness) {
  const directSignals = [
    business.business?.owner_name,
    business.business?.owner_role,
    business.business?.direct_phone,
    business.business?.direct_email,
  ].filter(Boolean).length;

  if (directSignals >= 3) return 1;
  if (directSignals === 2) return 0.72;
  if (directSignals === 1) return 0.42;
  return 0.1;
}

export function getFollowUpUrgencyFactor(business: CombinedBusiness) {
  const daysSince = getDaysSince(business.lastInteractionAt);

  if (business.status === "ganado" || business.status === "perdido" || business.status === "bloqueado") {
    return 0;
  }

  if (business.status === "sin_contactar") {
    return business.priority === "alta" ? 0.58 : 0.26;
  }

  if (daysSince === null) {
    return 0.44;
  }

  const thresholds: Partial<Record<ProspectStatus, number>> = {
    intento_contacto: 3,
    contactado: 2,
    reunion_agendada: 1,
    propuesta_enviada: 2,
    negociacion: 1,
  };

  const threshold = thresholds[business.status] ?? 3;
  if (daysSince >= threshold + 3) return 1;
  if (daysSince >= threshold) return 0.84;
  if (daysSince >= threshold - 1) return 0.58;
  return 0.18;
}

function getNonViablePenaltyFactor(status: ProspectStatus) {
  if (status === "bloqueado") return 1;
  if (status === "perdido") return 0.9;
  return 0;
}

function getVerticalAlignmentFactor(effectiveVertical: VerticalId, marketVertical: VerticalId) {
  if (effectiveVertical === marketVertical) return 1;
  if (effectiveVertical === "general_b2b") return 0.62;
  return 0.42;
}

export function calculateScoreLayer(input: {
  business: CombinedBusiness;
  scoringConfig: ScoringConfig;
  effectiveVertical: VerticalId;
  marketVertical: VerticalId;
  sectorPattern: SectorPattern | null;
  fallbackCity?: string;
}) {
  const { business, scoringConfig, effectiveVertical, marketVertical, sectorPattern } = input;
  const sectorFitFactor = sectorPattern
    ? clamp(
        Math.max(...Object.values(sectorPattern.serviceBias)) /
          Math.max(1, Object.values(sectorPattern.serviceBias).reduce((sum, value) => sum + value, 0)) +
          0.38,
        0.46,
        1,
      )
    : 0.52;

  const verticalAlignmentFactor = getVerticalAlignmentFactor(effectiveVertical, marketVertical);
  const sectorFit = sectorFitFactor * verticalAlignmentFactor * scoringConfig.sectorFit;
  const contactability = getContactabilityFactor(business) * scoringConfig.contactability;
  const websiteGap = getWebsiteGapFactor(business) * scoringConfig.websiteGap;
  const decisionMaker = getDecisionMakerFactor(business) * scoringConfig.decisionMaker;
  const prioritySignal = getPriorityFactor(business.priority) * scoringConfig.prioritySignal;
  const momentum = getMomentumFactor(business.status) * scoringConfig.momentum;
  const followUpUrgency = getFollowUpUrgencyFactor(business) * scoringConfig.followUpUrgency;
  const deadLeadPenalty = getNonViablePenaltyFactor(business.status) * DEAD_LEAD_PENALTY;

  const scoreMax =
    BASE_SCORE +
    scoringConfig.sectorFit +
    scoringConfig.contactability +
    scoringConfig.websiteGap +
    scoringConfig.decisionMaker +
    scoringConfig.prioritySignal +
    scoringConfig.momentum +
    scoringConfig.followUpUrgency;

  const rawScore =
    BASE_SCORE +
    sectorFit +
    contactability +
    websiteGap +
    decisionMaker +
    prioritySignal +
    momentum +
    followUpUrgency -
    deadLeadPenalty;

  const score = clamp(Math.round((rawScore / scoreMax) * 100), 0, 100);
  const breakdown: ScoreBreakdownItem[] = [
    {
      key: "sectorFit",
      label: "Encaje sectorial",
      value: Math.round(sectorFit * 10) / 10,
      max: scoringConfig.sectorFit,
      reason: sectorPattern
        ? `Patron detectado: ${sectorPattern.label}. Vertical activa: ${getVerticalLabel(effectiveVertical)}.`
        : `Sin patron claro. Vertical activa: ${getVerticalLabel(effectiveVertical)}.`,
      direction: "plus",
    },
    {
      key: "contactability",
      label: "Contactabilidad",
      value: Math.round(contactability * 10) / 10,
      max: scoringConfig.contactability,
      reason: "Mide si hay canales reales para abrir o seguir la conversacion.",
      direction: "plus",
    },
    {
      key: "websiteGap",
      label: "Hueco digital",
      value: Math.round(websiteGap * 10) / 10,
      max: scoringConfig.websiteGap,
      reason: "Premia oportunidades donde la capa comercial de Orbita puede aportar rapido.",
      direction: "plus",
    },
    {
      key: "decisionMaker",
      label: "Acceso a decisor",
      value: Math.round(decisionMaker * 10) / 10,
      max: scoringConfig.decisionMaker,
      reason: "Sube cuando ya hay dueno, cargo o contacto directo identificado.",
      direction: "plus",
    },
    {
      key: "prioritySignal",
      label: "Prioridad interna",
      value: Math.round(prioritySignal * 10) / 10,
      max: scoringConfig.prioritySignal,
      reason: "Refuerza la prioridad marcada por el equipo en la ficha.",
      direction: "plus",
    },
    {
      key: "momentum",
      label: "Momento comercial",
      value: Math.round(momentum * 10) / 10,
      max: scoringConfig.momentum,
      reason: `Estado actual: ${business.status}.`,
      direction: "plus",
    },
    {
      key: "followUpUrgency",
      label: "Urgencia de seguimiento",
      value: Math.round(followUpUrgency * 10) / 10,
      max: scoringConfig.followUpUrgency,
      reason: "Detecta cuando merece tocar hoy para no perder timing.",
      direction: "plus",
    },
    {
      key: "deadLeadPenalty",
      label: "Penalizacion por no viable",
      value: Math.round(deadLeadPenalty * 10) / 10,
      max: DEAD_LEAD_PENALTY,
      reason: "Perdido y bloqueado reducen el potencial comercial real.",
      direction: "minus",
    },
  ];

  const sectorLabel = sectorPattern?.label ?? business.category?.trim() ?? getVerticalLabel(marketVertical);
  const cityLabel = getCityLabel(business, input.fallbackCity);
  const urgencyFactor = getFollowUpUrgencyFactor(business);
  const isHot = score >= 76 || STATUS_RANK[business.status] >= STATUS_RANK.reunion_agendada;
  const needsFollowUp =
    business.status !== "sin_contactar" &&
    business.status !== "ganado" &&
    business.status !== "perdido" &&
    business.status !== "bloqueado" &&
    urgencyFactor >= 0.56;
  const dueToday = needsFollowUp && urgencyFactor >= 0.82;

  return {
    score,
    breakdown,
    sectorLabel,
    cityLabel,
    urgencyFactor,
    isHot,
    needsFollowUp,
    dueToday,
    daysSince: getDaysSince(business.lastInteractionAt),
  };
}
