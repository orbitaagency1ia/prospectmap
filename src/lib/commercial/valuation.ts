import { STATUS_RANK, type PriorityLevel, type ProspectStatus } from "@/lib/constants";
import type { CombinedBusiness } from "@/lib/types";
import { clamp } from "@/lib/utils";

import type { AccountCommercialProfile, ServiceRecommendation, ValueBand } from "./types";

const DEFAULT_SERVICE_VALUES = {
  asistente_multicanal: 1800,
  automatizacion_interna: 3200,
  avatar_ia: 1400,
  saas_a_medida: 6800,
} as const;

const STAGE_VALUE_MULTIPLIER: Record<ProspectStatus, number> = {
  sin_contactar: 0.44,
  intento_contacto: 0.5,
  contactado: 0.64,
  reunion_agendada: 0.82,
  propuesta_enviada: 0.94,
  negociacion: 1.08,
  ganado: 1,
  perdido: 0.12,
  bloqueado: 0,
};

const BASE_CLOSE_PROBABILITY: Record<ProspectStatus, number> = {
  sin_contactar: 0.1,
  intento_contacto: 0.15,
  contactado: 0.24,
  reunion_agendada: 0.44,
  propuesta_enviada: 0.58,
  negociacion: 0.74,
  ganado: 1,
  perdido: 0.04,
  bloqueado: 0,
};

function extractNumbers(text?: string | null) {
  if (!text) {
    return [];
  }

  return Array.from(text.replace(/\./g, "").matchAll(/[0-9]+(?:,[0-9]+)?/g))
    .map((match) => Number(match[0].replace(",", ".")))
    .filter((value) => Number.isFinite(value));
}

function getBaseAccountValue(profile: AccountCommercialProfile, service: ServiceRecommendation) {
  const priceNumbers = extractNumbers(profile.pricingProfile.averagePriceRange);
  const minimumNumbers = extractNumbers(profile.pricingProfile.minimumDesiredTicket);

  if (priceNumbers.length >= 2) {
    return (priceNumbers[0] + priceNumbers[1]) / 2;
  }

  if (priceNumbers[0]) {
    return priceNumbers[0];
  }

  if (minimumNumbers[0]) {
    return minimumNumbers[0] * 1.24;
  }

  return DEFAULT_SERVICE_VALUES[service.service];
}

function getPriorityMultiplier(priority: PriorityLevel | null) {
  if (priority === "alta") return 1.14;
  if (priority === "baja") return 0.88;
  return 1;
}

function getInformationMultiplier(business: CombinedBusiness) {
  const signals = [
    business.business?.owner_name,
    business.business?.owner_role,
    business.business?.direct_email,
    business.business?.direct_phone,
    business.business?.website ?? business.overpass?.website,
    business.business?.phone ?? business.overpass?.phone,
  ].filter(Boolean).length;

  return 0.88 + Math.min(signals, 6) * 0.04;
}

function getValueBand(value: number): ValueBand {
  if (value >= 5000) return "alto";
  if (value >= 2200) return "medio";
  return "bajo";
}

function buildValueLabel(value: number, band: ValueBand, service: ServiceRecommendation) {
  const bandLabel = band === "alto" ? "alto" : band === "medio" ? "medio" : "contenido";
  return `Valor potencial ${bandLabel} para ${service.shortLabel.toLowerCase()}.`;
}

export function estimateCommercialValue(input: {
  business: CombinedBusiness;
  accountProfile: AccountCommercialProfile;
  service: ServiceRecommendation;
  score: number;
}) {
  const { business, accountProfile, service, score } = input;
  const baseValue = getBaseAccountValue(accountProfile, service);
  const stageMultiplier = STAGE_VALUE_MULTIPLIER[business.status];
  const scoreMultiplier = 0.74 + score / 180;
  const fitMultiplier =
    service.fitLabel === "encaje alto" ? 1.1 : service.fitLabel === "encaje medio" ? 1 : 0.86;
  const estimatedValue = Math.max(
    0,
    Math.round((baseValue * stageMultiplier * scoreMultiplier * fitMultiplier * getPriorityMultiplier(business.priority) * getInformationMultiplier(business)) / 50) * 50,
  );

  const closeProbability = clamp(
    BASE_CLOSE_PROBABILITY[business.status] + score / 420 - (STATUS_RANK[business.status] < STATUS_RANK.contactado ? 0.02 : 0),
    0,
    1,
  );
  const weightedValue = Math.round(estimatedValue * closeProbability);
  const valueBand = getValueBand(estimatedValue);

  return {
    estimatedValue,
    weightedValue,
    closeProbability,
    valueBand,
    estimatedValueLabel: buildValueLabel(estimatedValue, valueBand, service),
  };
}
