import type { CombinedBusiness } from "@/lib/types";

import { SERVICE_META, getVerticalConfig } from "./verticals";
import type {
  CommercialPreferences,
  DemoBadge,
  NextBestAction,
  ServiceRecommendation,
  SuggestedMessages,
  VerticalId,
} from "./types";

function getNarrativeHook(preferences: CommercialPreferences) {
  if (preferences.salesNarrative === "roi") {
    return "impacto claro en conversion y retorno";
  }

  if (preferences.salesNarrative === "operacion") {
    return "menos friccion operativa y mas foco del equipo";
  }

  return "mas captacion y mejor seguimiento comercial";
}

export function buildSuggestedMessages(input: {
  business: CombinedBusiness;
  effectiveVertical: VerticalId;
  service: ServiceRecommendation;
  painPoint: string;
  preferences: CommercialPreferences;
}): SuggestedMessages {
  const { business, effectiveVertical, service, painPoint, preferences } = input;
  const vertical = getVerticalConfig(effectiveVertical);
  const narrativeHook = getNarrativeHook(preferences);
  const benefit = SERVICE_META[service.service].benefit;

  return {
    initial: `Hola ${business.name}, soy del equipo de Orbita. En ${vertical.shortLabel.toLowerCase()} solemos ver mucho desgaste en ${painPoint}. Creemos que ${service.label.toLowerCase()} puede ayudaros a ${benefit}, con foco en ${narrativeHook}. Si te encaja, te enseño un caso muy concreto en 15 minutos.`,
    followUp1: `Retomo esto por si se os paso. La idea para ${business.name} no es meter complejidad, sino atacar ${painPoint} con ${service.shortLabel.toLowerCase()} y una implantacion bastante ligera. Si quieres, te paso un ejemplo realista.`,
    followUp2: `Cierro el hilo por ahora. Si mas adelante queréis mejorar ${vertical.messageHooks.opening} o probar una solucion tipo ${service.shortLabel.toLowerCase()}, en Orbita lo podemos aterrizar muy a medida.`,
  };
}

export function buildDemoBadges(input: {
  business: CombinedBusiness;
  service: ServiceRecommendation;
  nextAction: NextBestAction;
  score: number;
  effectiveVertical: VerticalId;
}): DemoBadge[] {
  const badges: DemoBadge[] = [];

  if (input.score >= 75) {
    badges.push({ label: "Alta oportunidad", tone: "emerald" });
  }

  if (input.service.service === "avatar_ia") {
    badges.push({ label: "Encaja con avatar IA", tone: "violet" });
  }

  if (input.service.service === "automatizacion_interna") {
    badges.push({ label: "Buena opcion para automatizacion", tone: "cyan" });
  }

  const hasPhone = Boolean(input.business.business?.phone ?? input.business.overpass?.phone);
  if (hasPhone && ["autoescuelas", "clinicas", "hoteles"].includes(input.effectiveVertical)) {
    badges.push({ label: "Saturable por WhatsApp", tone: "amber" });
  }

  if (input.nextAction.urgency === "alta") {
    badges.push({ label: "Seguimiento urgente", tone: "amber" });
  }

  if (input.service.service === "asistente_multicanal") {
    badges.push({ label: "Atencion multicanal clara", tone: "cyan" });
  }

  return badges.slice(0, 4);
}
