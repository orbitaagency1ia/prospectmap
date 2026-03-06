import type { CombinedBusiness } from "@/lib/types";

import { getVerticalConfig } from "./verticals";
import type {
  AccountCommercialProfile,
  NextBestAction,
  ObjectionResponse,
  ServiceRecommendation,
  VerticalId,
} from "./types";

export function buildFitSignals(input: {
  business: CombinedBusiness;
  accountProfile: AccountCommercialProfile;
  service: ServiceRecommendation;
  effectiveVertical: VerticalId;
}) {
  const { business, accountProfile, service, effectiveVertical } = input;
  const signals = [
    `Encaja con la vertical ${getVerticalConfig(effectiveVertical).label.toLowerCase()}.`,
    `Servicio sugerido: ${service.label}.`,
    business.business?.phone ?? business.overpass?.phone ? "Hay canal de contacto telefonico." : null,
    business.business?.website ?? business.overpass?.website ? "Tiene presencia web revisable antes del primer toque." : null,
    accountProfile.offerProfile.valueProposition ? `La cuenta aporta un valor claro: ${accountProfile.offerProfile.valueProposition}.` : null,
  ].filter((value): value is string => Boolean(value));

  return signals.slice(0, 4);
}

export function buildRiskSignals(input: {
  business: CombinedBusiness;
  objections: ObjectionResponse[];
}) {
  const { business, objections } = input;

  const signals = [
    !(business.business?.email ?? business.overpass?.email) ? "No hay email visible; el canal puede ser mas limitado." : null,
    !business.business?.owner_name ? "No hay decisor identificado todavia." : null,
    business.status === "perdido" ? "El negocio ya fue marcado como perdido; revisar antes de reabrir." : null,
    objections[0] ? `Objecion probable dominante: ${objections[0].objection}` : null,
  ].filter((value): value is string => Boolean(value));

  return signals.slice(0, 4);
}

export function buildMissingData(business: CombinedBusiness) {
  const items = [
    !(business.business?.website ?? business.overpass?.website)
      ? "Revisa si existe web o landing antes de contactar para afinar el angulo."
      : null,
    !(business.business?.phone ?? business.overpass?.phone)
      ? "Busca un telefono de contacto; ahora mismo el canal directo es debil."
      : null,
    !business.business?.owner_name ? "Intenta identificar decisor o cargo antes del siguiente toque." : null,
    !business.business?.category ? "Aclara el sector exacto del negocio para refinar scoring y guion." : null,
  ].filter((value): value is string => Boolean(value));

  return items.slice(0, 4);
}

export function buildReviewChecklist(input: {
  business: CombinedBusiness;
  accountProfile: AccountCommercialProfile;
  service: ServiceRecommendation;
}) {
  const { business, accountProfile, service } = input;

  const checklist = [
    business.business?.website ?? business.overpass?.website ? "Revisar web y propuesta actual del negocio." : "Buscar una referencia publica minima del negocio.",
    "Confirmar quien decide o quien responde primero.",
    `Alinear el primer toque con ${service.shortLabel.toLowerCase()}.`,
    accountProfile.offerProfile.reviewBeforeContact[0] ?? "Entrar con un beneficio concreto, no con una descripcion tecnica.",
  ];

  return checklist.slice(0, 4);
}

export function buildAvoidTalkingPoints(accountProfile: AccountCommercialProfile, objections: ObjectionResponse[]) {
  const avoid = [
    ...accountProfile.offerProfile.avoidTalkingPoints,
    objections[0] ? `No abras defendiendote de "${objections[0].objection}".` : null,
    "No hables de automatizacion como fin; habla del problema que resuelve.",
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(avoid)).slice(0, 4);
}

export function buildCommercialAngle(input: {
  accountProfile: AccountCommercialProfile;
  service: ServiceRecommendation;
  painPoint: string;
}) {
  const { accountProfile, service, painPoint } = input;

  return (
    accountProfile.offerProfile.recommendedAngles[0] ||
    `Entrar por ${painPoint} y mover la conversacion hacia ${service.shortLabel.toLowerCase()} con un beneficio concreto.`
  );
}

export function buildCtaSuggestion(accountProfile: AccountCommercialProfile, nextAction: NextBestAction) {
  return (
    accountProfile.offerProfile.preferredCta ||
    `CTA sugerida: ${nextAction.action}. Pedir una llamada corta o una demo aterrizada.`
  );
}

export function buildExecutiveSummary(input: {
  business: CombinedBusiness;
  service: ServiceRecommendation;
  nextAction: NextBestAction;
  painPoint: string;
  accountProfile: AccountCommercialProfile;
}) {
  const { business, service, nextAction, painPoint, accountProfile } = input;

  return `${business.name} parece una cuenta util para atacar por ${painPoint}. El encaje principal se apoya en ${service.shortLabel.toLowerCase()} y la siguiente jugada recomendada es ${nextAction.action.toLowerCase()}. ${accountProfile.offerProfile.valueProposition ? `La propuesta debe anclarse en ${accountProfile.offerProfile.valueProposition}.` : ""}`.trim();
}
