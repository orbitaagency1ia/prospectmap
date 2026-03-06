import { STATUS_RANK, type PriorityLevel, type ProspectStatus } from "@/lib/constants";
import type { CombinedBusiness } from "@/lib/types";
import { clamp, normalizeText } from "@/lib/utils";

import { getVerticalConfig, getVerticalLabel } from "./verticals";
import type {
  AccountCommercialProfile,
  ScoreBreakdownItem,
  ScoringConfig,
  SectorPattern,
  VerticalId,
} from "./types";

const BASE_SCORE = 10;
const DEAD_LEAD_PENALTY = 34;

export function getBusinessText(business: CombinedBusiness) {
  return normalizeText(
    [
      business.name,
      business.category,
      business.city,
      business.business?.address ?? business.overpass?.address,
      business.business?.website ?? business.overpass?.website,
    ]
      .filter(Boolean)
      .join(" "),
  );
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

function getBusinessSignalRichness(business: CombinedBusiness) {
  const row = business.business;
  const signals = [
    row?.direct_phone,
    row?.direct_email,
    row?.owner_name,
    row?.owner_role,
    row?.phone ?? business.overpass?.phone,
    row?.email ?? business.overpass?.email,
    row?.website ?? business.overpass?.website,
    row?.opening_hours ?? business.overpass?.opening_hours,
  ].filter(Boolean).length;

  return clamp(signals / 8, 0.08, 1);
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

function toKeywordPool(values: Array<string | null | undefined>) {
  return values
    .flatMap((value) => sanitizeTextFragments(value))
    .filter(Boolean);
}

function sanitizeTextFragments(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,;|\n]+/)
    .map((chunk) => normalizeText(chunk))
    .filter((chunk) => chunk.length >= 3);
}

function keywordMatchFactor(text: string, keywords: string[]) {
  if (keywords.length === 0) {
    return 0.54;
  }

  const matched = keywords.filter((keyword) => text.includes(keyword)).length;
  const ratio = matched / keywords.length;
  return clamp(0.22 + ratio * 0.92, 0.14, 1);
}

function excludedKeywordPenalty(text: string, keywords: string[]) {
  if (keywords.length === 0) {
    return 0;
  }

  return keywords.some((keyword) => text.includes(keyword)) ? 0.28 : 0;
}

function getIcpFitFactor(business: CombinedBusiness, profile: AccountCommercialProfile, fallbackCity?: string) {
  const businessText = getBusinessText(business);
  const positiveKeywords = toKeywordPool([
    profile.sector,
    profile.idealCustomerProfile.targetCustomer,
    ...profile.targetVerticals,
    ...profile.targetSubsectors,
    ...profile.idealCustomerProfile.bestFitCompanyTraits,
    ...profile.knowledgeSummary.detectedTargetSegments,
  ]);
  const geographyKeywords = toKeywordPool([
    getCityLabel(business, fallbackCity),
    ...profile.idealCustomerProfile.targetGeographies,
  ]);
  const excludedKeywords = toKeywordPool(profile.idealCustomerProfile.excludedCompanyTraits);

  const base = keywordMatchFactor(businessText, positiveKeywords);
  const geographyBoost = keywordMatchFactor(businessText, geographyKeywords) * 0.16;
  const penalty = excludedKeywordPenalty(businessText, excludedKeywords);

  return clamp(base + geographyBoost - penalty, 0.05, 1);
}

function getOfferFitFactor(
  business: CombinedBusiness,
  profile: AccountCommercialProfile,
  sectorPattern: SectorPattern | null,
) {
  const businessText = getBusinessText(business);
  const offerKeywords = toKeywordPool([
    profile.offerProfile.whatYouSell,
    profile.offerProfile.mainProblemSolved,
    profile.offerProfile.valueProposition,
    ...profile.offerProfile.mainServices,
    ...profile.offerProfile.secondaryServices,
    ...profile.offerProfile.recommendedAngles,
    ...profile.knowledgeSummary.detectedServices,
    ...profile.knowledgeSummary.detectedValueProps,
  ]);

  const base = keywordMatchFactor(businessText, offerKeywords);
  const verticalPatternBoost = sectorPattern ? 0.14 : 0;

  return clamp(base + verticalPatternBoost, 0.08, 1);
}

function parseTicketValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(/,/g, ".").match(/[0-9]+(?:\.[0-9]+)?/);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTicketFitFactor(business: CombinedBusiness, profile: AccountCommercialProfile) {
  const minimumTicket = parseTicketValue(profile.pricingProfile.minimumDesiredTicket);
  const averageRange = parseTicketValue(profile.pricingProfile.averagePriceRange);
  const richness = getBusinessSignalRichness(business);
  const hasWebsite = Boolean(business.business?.website ?? business.overpass?.website);
  const hasOwner = Boolean(business.business?.owner_name || business.business?.owner_role);

  if (!minimumTicket && !averageRange) {
    return clamp(0.42 + richness * 0.42, 0.22, 0.9);
  }

  const desiredLevel = minimumTicket ?? averageRange ?? 0;

  if (desiredLevel >= 5000) {
    return hasWebsite && hasOwner ? clamp(0.46 + richness * 0.56, 0.26, 1) : clamp(0.18 + richness * 0.4, 0.08, 0.74);
  }

  if (desiredLevel >= 2000) {
    return clamp(0.3 + richness * 0.56, 0.16, 0.92);
  }

  return clamp(0.48 + richness * 0.38, 0.2, 0.96);
}

function getNeedSignalFactor(
  business: CombinedBusiness,
  profile: AccountCommercialProfile,
  sectorPattern: SectorPattern | null,
) {
  const businessText = getBusinessText(business);
  const missingSignals = [
    !(business.business?.website ?? business.overpass?.website),
    !(business.business?.phone ?? business.overpass?.phone),
    !business.business?.owner_name,
    !(business.business?.email ?? business.overpass?.email),
  ].filter(Boolean).length;
  const profilePainKeywords = toKeywordPool([
    profile.offerProfile.mainProblemSolved,
    ...profile.knowledgeSummary.detectedPainPoints,
  ]);
  const painMatch = keywordMatchFactor(businessText, profilePainKeywords);

  return clamp(0.18 + missingSignals * 0.14 + painMatch * 0.42 + (sectorPattern ? 0.08 : 0), 0.08, 1);
}

function getPotentialSignalFactor(
  business: CombinedBusiness,
  effectiveVertical: VerticalId,
  marketVertical: VerticalId,
) {
  const richness = getBusinessSignalRichness(business);
  const verticalAlignment = getVerticalAlignmentFactor(effectiveVertical, marketVertical);
  const pipelineMomentum = getMomentumFactor(business.status);

  return clamp(0.18 + richness * 0.44 + verticalAlignment * 0.24 + pipelineMomentum * 0.18, 0.08, 1);
}

export function calculateScoreLayer(input: {
  business: CombinedBusiness;
  scoringConfig: ScoringConfig;
  effectiveVertical: VerticalId;
  marketVertical: VerticalId;
  sectorPattern: SectorPattern | null;
  accountProfile: AccountCommercialProfile;
  fallbackCity?: string;
}) {
  const { business, scoringConfig, effectiveVertical, marketVertical, sectorPattern, accountProfile } = input;
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
  const icpFitFactor = getIcpFitFactor(business, accountProfile, input.fallbackCity);
  const icpFit = icpFitFactor * scoringConfig.icpFit;
  const offerFitFactor = getOfferFitFactor(business, accountProfile, sectorPattern);
  const offerFit = offerFitFactor * scoringConfig.offerFit;
  const ticketFitFactor = getTicketFitFactor(business, accountProfile);
  const ticketFit = ticketFitFactor * scoringConfig.ticketFit;
  const contactability = getContactabilityFactor(business) * scoringConfig.contactability;
  const websiteGap = getWebsiteGapFactor(business) * scoringConfig.websiteGap;
  const decisionMaker = getDecisionMakerFactor(business) * scoringConfig.decisionMaker;
  const prioritySignal = getPriorityFactor(business.priority) * scoringConfig.prioritySignal;
  const momentum = getMomentumFactor(business.status) * scoringConfig.momentum;
  const followUpUrgency = getFollowUpUrgencyFactor(business) * scoringConfig.followUpUrgency;
  const needSignalFactor = getNeedSignalFactor(business, accountProfile, sectorPattern);
  const needSignal = needSignalFactor * scoringConfig.needSignal;
  const potentialSignalFactor = getPotentialSignalFactor(business, effectiveVertical, marketVertical);
  const potentialSignal = potentialSignalFactor * scoringConfig.potentialSignal;
  const deadLeadPenalty = getNonViablePenaltyFactor(business.status) * DEAD_LEAD_PENALTY;

  const scoreMax =
    BASE_SCORE +
    scoringConfig.sectorFit +
    scoringConfig.icpFit +
    scoringConfig.offerFit +
    scoringConfig.ticketFit +
    scoringConfig.contactability +
    scoringConfig.websiteGap +
    scoringConfig.decisionMaker +
    scoringConfig.prioritySignal +
    scoringConfig.momentum +
    scoringConfig.followUpUrgency +
    scoringConfig.needSignal +
    scoringConfig.potentialSignal;

  const rawScore =
    BASE_SCORE +
    sectorFit +
    icpFit +
    offerFit +
    ticketFit +
    contactability +
    websiteGap +
    decisionMaker +
    prioritySignal +
    momentum +
    followUpUrgency +
    needSignal +
    potentialSignal -
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
      key: "icpFit",
      label: "Encaje ICP",
      value: Math.round(icpFit * 10) / 10,
      max: scoringConfig.icpFit,
      reason: accountProfile.idealCustomerProfile.targetCustomer
        ? `Se compara con el cliente ideal definido por la cuenta: ${accountProfile.idealCustomerProfile.targetCustomer}.`
        : "La cuenta no ha definido todavia un ICP detallado; se usa una base neutra.",
      direction: "plus",
    },
    {
      key: "offerFit",
      label: "Compatibilidad de oferta",
      value: Math.round(offerFit * 10) / 10,
      max: scoringConfig.offerFit,
      reason: accountProfile.offerProfile.whatYouSell
        ? `Se cruza el negocio con la oferta declarada: ${accountProfile.offerProfile.whatYouSell}.`
        : "Falta describir la oferta exacta de la cuenta para afinar mejor este bloque.",
      direction: "plus",
    },
    {
      key: "ticketFit",
      label: "Encaje de ticket",
      value: Math.round(ticketFit * 10) / 10,
      max: scoringConfig.ticketFit,
      reason: accountProfile.pricingProfile.minimumDesiredTicket
        ? `Se calibra frente al ticket minimo deseado (${accountProfile.pricingProfile.minimumDesiredTicket}).`
        : "Sin ticket objetivo definido, se usa una lectura conservadora del potencial del negocio.",
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
      key: "needSignal",
      label: "Senal de necesidad",
      value: Math.round(needSignal * 10) / 10,
      max: scoringConfig.needSignal,
      reason: "Sube cuando se detecta friccion, hueco operativo o dolor comercial visible.",
      direction: "plus",
    },
    {
      key: "potentialSignal",
      label: "Senal de potencial",
      value: Math.round(potentialSignal * 10) / 10,
      max: scoringConfig.potentialSignal,
      reason: "Intenta separar negocios con mas capacidad aparente de los que parecen menos aprovechables.",
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
