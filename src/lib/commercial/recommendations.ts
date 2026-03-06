import { STATUS_RANK } from "@/lib/constants";
import type { CombinedBusiness } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

import { SERVICE_META, getVerticalConfig } from "./verticals";
import type {
  AccountCommercialProfile,
  CommercialPreferences,
  NextBestAction,
  OrbitaService,
  SectorPattern,
  ServiceRecommendation,
  UrgencyLevel,
  VerticalId,
} from "./types";

function chooseUrgency(value: number): UrgencyLevel {
  if (value >= 0.82) return "alta";
  if (value >= 0.56) return "media";
  return "baja";
}

export function detectPainPoint(
  business: CombinedBusiness,
  effectiveVertical: VerticalId,
  sectorPattern: SectorPattern | null,
  accountProfile: AccountCommercialProfile,
): string {
  const vertical = getVerticalConfig(effectiveVertical);
  const hasWebsite = Boolean(business.business?.website ?? business.overpass?.website);
  const hasPhone = Boolean(business.business?.phone ?? business.overpass?.phone);
  const hasOwnerData = Boolean(
    business.business?.owner_name || business.business?.owner_role || business.business?.direct_phone,
  );

  if (!hasPhone) {
    return "falta un canal de contacto claro y eso suele frenar la captacion";
  }

  if (!hasWebsite) {
    return "hay margen comercial evidente en la primera respuesta y en como captan interes";
  }

  if (!hasOwnerData) {
    return "la operativa comercial parece depender de contacto general, no de un decisor claro";
  }

  if (accountProfile.offerProfile.mainProblemSolved) {
    return accountProfile.offerProfile.mainProblemSolved;
  }

  if (accountProfile.knowledgeSummary.detectedPainPoints[0]) {
    return accountProfile.knowledgeSummary.detectedPainPoints[0];
  }

  return sectorPattern?.pains[0] ?? vertical.genericPains[0];
}

export function buildCommercialFocus(
  effectiveVertical: VerticalId,
  preferences: CommercialPreferences,
  painPoint: string,
  accountProfile: AccountCommercialProfile,
) {
  const vertical = getVerticalConfig(effectiveVertical);
  const narrative =
    preferences.salesNarrative === "roi"
      ? "demostrar retorno rapido"
      : preferences.salesNarrative === "operacion"
        ? "quitar friccion operativa"
        : "captar mas y mejor";

  const valueHook = accountProfile.offerProfile.valueProposition
    ? `Propuesta de valor base: ${accountProfile.offerProfile.valueProposition}.`
    : "";

  return `${vertical.focusHeadline} Foco actual: ${narrative} sobre ${painPoint}. ${valueHook}`.trim();
}

function getAccountServiceBias(profile: AccountCommercialProfile) {
  const keywords = normalizeText(
    [
      profile.offerProfile.whatYouSell,
      ...profile.offerProfile.mainServices,
      ...profile.offerProfile.secondaryServices,
      ...profile.knowledgeSummary.detectedServices,
    ].join(" "),
  );

  const bias: Record<OrbitaService, number> = {
    asistente_multicanal: 0,
    automatizacion_interna: 0,
    avatar_ia: 0,
    saas_a_medida: 0,
  };

  if (keywords.includes("asistente") || keywords.includes("agente") || keywords.includes("whatsapp")) {
    bias.asistente_multicanal += 8;
  }

  if (keywords.includes("automat") || keywords.includes("proceso")) {
    bias.automatizacion_interna += 8;
  }

  if (keywords.includes("avatar") || keywords.includes("video")) {
    bias.avatar_ia += 8;
  }

  if (keywords.includes("saas") || keywords.includes("software") || keywords.includes("herramienta propia")) {
    bias.saas_a_medida += 8;
  }

  return bias;
}

export function buildServiceRecommendation(input: {
  business: CombinedBusiness;
  effectiveVertical: VerticalId;
  marketVertical: VerticalId;
  sectorPattern: SectorPattern | null;
  score: number;
  painPoint: string;
  accountProfile: AccountCommercialProfile;
}): ServiceRecommendation {
  const { business, effectiveVertical, marketVertical, sectorPattern, score, painPoint, accountProfile } = input;
  const effectiveConfig = getVerticalConfig(effectiveVertical);
  const marketConfig = getVerticalConfig(marketVertical);
  const accountBias = getAccountServiceBias(accountProfile);

  const scores: Record<OrbitaService, number> = {
    asistente_multicanal:
      effectiveConfig.serviceBoosts.asistente_multicanal + marketConfig.serviceBoosts.asistente_multicanal + accountBias.asistente_multicanal,
    automatizacion_interna:
      effectiveConfig.serviceBoosts.automatizacion_interna + marketConfig.serviceBoosts.automatizacion_interna + accountBias.automatizacion_interna,
    avatar_ia: effectiveConfig.serviceBoosts.avatar_ia + marketConfig.serviceBoosts.avatar_ia + accountBias.avatar_ia,
    saas_a_medida: effectiveConfig.serviceBoosts.saas_a_medida + marketConfig.serviceBoosts.saas_a_medida + accountBias.saas_a_medida,
  };

  if (sectorPattern) {
    scores.asistente_multicanal += sectorPattern.serviceBias.asistente_multicanal;
    scores.automatizacion_interna += sectorPattern.serviceBias.automatizacion_interna;
    scores.avatar_ia += sectorPattern.serviceBias.avatar_ia;
    scores.saas_a_medida += sectorPattern.serviceBias.saas_a_medida;
  }

  const hasWebsite = Boolean(business.business?.website ?? business.overpass?.website);
  const hasOpeningHours = Boolean(business.business?.opening_hours ?? business.overpass?.opening_hours);
  const hasOwnerData = Boolean(business.business?.owner_name || business.business?.owner_role);
  const advancedStage = STATUS_RANK[business.status] >= STATUS_RANK.reunion_agendada;

  if (hasOpeningHours) {
    scores.asistente_multicanal += 7;
  }

  if (!hasWebsite) {
    scores.avatar_ia += 6;
    scores.asistente_multicanal += 4;
  } else {
    scores.saas_a_medida += 6;
  }

  if (hasOwnerData) {
    scores.automatizacion_interna += 5;
    scores.saas_a_medida += 4;
  }

  if (advancedStage || score >= 82) {
    scores.saas_a_medida += 6;
  }

  if (painPoint.includes("captacion") || painPoint.includes("respuesta")) {
    scores.asistente_multicanal += 4;
    scores.avatar_ia += 3;
  }

  if (accountProfile.pricingProfile.minimumDesiredTicket) {
    scores.saas_a_medida += 2;
    scores.automatizacion_interna += 2;
  }

  const service = (Object.keys(scores) as OrbitaService[]).reduce((best, current) =>
    scores[current] > scores[best] ? current : best,
  );

  const fitLabel =
    scores[service] >= 36 ? "encaje alto" : scores[service] >= 24 ? "encaje medio" : "encaje bajo";
  const reasons = [
    `vertical activa: ${effectiveConfig.label.toLowerCase()}`,
    sectorPattern ? `patron detectado: ${sectorPattern.label.toLowerCase()}` : null,
    accountBias[service] > 0 ? "alineado con la oferta declarada por la cuenta" : null,
    hasOpeningHours ? "mucha demanda de respuesta" : null,
    hasOwnerData ? "hay acceso parcial a decisor" : null,
    !hasWebsite ? "hay hueco digital visible" : null,
  ].filter((value): value is string => Boolean(value));

  return {
    service,
    label: SERVICE_META[service].label,
    shortLabel: SERVICE_META[service].shortLabel,
    fitLabel,
    reason: `Encaja por ${reasons.join(", ")}.`,
    reasons,
  };
}

export function pickBestChannel(
  business: CombinedBusiness,
  preferences: CommercialPreferences,
  accountProfile?: AccountCommercialProfile,
) {
  const channels = {
    llamada_directa: Boolean(business.business?.direct_phone),
    email_directo: Boolean(business.business?.direct_email),
    llamada: Boolean(business.business?.phone ?? business.overpass?.phone),
    email: Boolean(business.business?.email ?? business.overpass?.email),
    formulario: Boolean(business.business?.website ?? business.overpass?.website),
  };

  const preferredChannels = normalizeText((accountProfile?.prospectingPreferences.preferredChannels ?? []).join(" "));

  if (preferredChannels.includes("whatsapp") || preferredChannels.includes("llamada")) {
    if (channels.llamada_directa) return "Llamada directa";
    if (channels.llamada) return "Llamada";
  }

  if (preferredChannels.includes("email")) {
    if (channels.email_directo) return "Email directo";
    if (channels.email) return "Email";
  }

  if (preferences.preferredOutreach === "llamada_primero") {
    if (channels.llamada_directa) return "Llamada directa";
    if (channels.llamada) return "Llamada";
    if (channels.email_directo) return "Email directo";
  }

  if (preferences.preferredOutreach === "email_primero") {
    if (channels.email_directo) return "Email directo";
    if (channels.email) return "Email";
    if (channels.llamada_directa) return "Llamada directa";
  }

  if (channels.llamada_directa) return "Llamada directa";
  if (channels.email_directo) return "Email directo";
  if (channels.llamada) return "Llamada";
  if (channels.email) return "Email";
  if (channels.formulario) return "Formulario web";
  return "Visita local";
}

export function buildNextBestAction(input: {
  business: CombinedBusiness;
  service: ServiceRecommendation;
  followUpUrgencyFactor: number;
  preferences: CommercialPreferences;
  accountProfile?: AccountCommercialProfile;
}): NextBestAction {
  const { business, service, followUpUrgencyFactor, preferences, accountProfile } = input;
  const channel = pickBestChannel(business, preferences, accountProfile);
  const urgency = chooseUrgency(followUpUrgencyFactor);

  if (business.status === "bloqueado") {
    return {
      action: "Excluir de secuencias activas",
      channel,
      reason: "Lead bloqueado. Solo conviene mantener contexto, no seguir empujando.",
      urgency: "baja",
    };
  }

  if (business.status === "perdido") {
    return {
      action: "Archivar y revisar si cambia contexto",
      channel,
      reason: "Marcado como perdido. No merece energia comercial inmediata.",
      urgency: "baja",
    };
  }

  if (business.status === "ganado") {
    return {
      action: "Buscar ampliacion o nuevo caso de uso",
      channel,
      reason: "Ya es cliente; la palanca ahora es expansion o referidos.",
      urgency: "media",
    };
  }

  if (business.status === "sin_contactar") {
    return {
      action: `Abrir conversacion con angulo de ${service.shortLabel.toLowerCase()}`,
      channel,
      reason: "Todavia no se ha trabajado y ya hay señal suficiente para un primer toque claro.",
      urgency,
    };
  }

  if (business.status === "intento_contacto") {
    return {
      action: "Reintentar con beneficio mas concreto",
      channel,
      reason: "La siguiente mejora no es insistir igual, sino concretar mejor el valor.",
      urgency,
    };
  }

  if (business.status === "contactado") {
    return {
      action: "Convertir el interes en reunion corta",
      channel,
      reason: `Ya hubo contacto; ahora toca moverlo a diagnostico alrededor de ${service.shortLabel.toLowerCase()}.`,
      urgency,
    };
  }

  if (business.status === "reunion_agendada") {
    return {
      action: "Preparar demo y caso de uso especifico",
      channel,
      reason: "La reunion ya existe. Lo critico es llegar con una narrativa quirurgica.",
      urgency: "alta",
    };
  }

  if (business.status === "propuesta_enviada") {
    return {
      action: "Seguir propuesta con objecion principal",
      channel,
      reason: "Hay que provocar respuesta y reducir friccion de compra.",
      urgency,
    };
  }

  return {
    action: "Desbloquear objeciones y empujar cierre",
    channel,
    reason: "La oportunidad esta en negociacion y el riesgo es perder timing.",
    urgency: "alta",
  };
}
