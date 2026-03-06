import { SERVICE_META, getVerticalConfig } from "./verticals";
import type { AccountCommercialProfile, ObjectionResponse, OrbitaService, VerticalId } from "./types";

const SERVICE_OBJECTIONS: Record<OrbitaService, ObjectionResponse[]> = {
  asistente_multicanal: [
    {
      objection: "No queremos sonar automatizados.",
      response: "La capa automatizada filtra lo repetitivo; el tono y el pase a humano siguen bajo control vuestro.",
    },
  ],
  automatizacion_interna: [
    {
      objection: "Nuestro proceso es demasiado particular.",
      response: "Precisamente por eso encaja automatizacion interna: se adapta al proceso real en lugar de forzarlo.",
    },
  ],
  avatar_ia: [
    {
      objection: "Un avatar no transmite confianza.",
      response: "Si se usa bien, el avatar no sustituye la relacion; acelera explicaciones repetidas y mejora la primera respuesta.",
    },
  ],
  saas_a_medida: [
    {
      objection: "Eso suena grande para nosotros.",
      response: "No hace falta empezar grande. La gracia es resolver primero la pieza critica y crecer solo si compensa.",
    },
  ],
};

export function buildObjectionResponses(
  vertical: VerticalId,
  service: OrbitaService,
  accountProfile?: AccountCommercialProfile,
): ObjectionResponse[] {
  const verticalObjections = getVerticalConfig(vertical).objectionLibrary;
  const serviceObjections = SERVICE_OBJECTIONS[service] ?? [];
  const accountObjections =
    accountProfile?.offerProfile.typicalObjections.slice(0, 3).map((item) => ({
      objection: item,
      response:
        accountProfile.offerProfile.valueProposition ||
        `La propuesta con ${SERVICE_META[service].shortLabel.toLowerCase()} busca impacto real sin meter complejidad innecesaria.`,
    })) ?? [];

  return [...accountObjections, ...verticalObjections, ...serviceObjections].slice(0, 4).map((item) => ({
    objection: item.objection,
    response:
      item.response ||
      `La propuesta con ${SERVICE_META[service].shortLabel.toLowerCase()} busca impacto real sin meter complejidad innecesaria.`,
  }));
}
