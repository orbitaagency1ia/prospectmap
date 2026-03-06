import { PRIORITY_OPTIONS, STATUS_RANK, type PriorityLevel, type ProspectStatus } from "@/lib/constants";
import type { CombinedBusiness } from "@/lib/types";
import { clamp, normalizeText } from "@/lib/utils";

export const ORBITA_SERVICES = [
  "asistente_multicanal",
  "automatizacion_interna",
  "avatar_ia",
  "saas_a_medida",
] as const;

export type OrbitaService = (typeof ORBITA_SERVICES)[number];
export type OpportunityTier = "alta_oportunidad" | "media_oportunidad" | "baja_oportunidad";
export type UrgencyLevel = "alta" | "media" | "baja";

export type ScoringConfig = {
  sectorFit: number;
  contactability: number;
  websiteGap: number;
  decisionMaker: number;
  prioritySignal: number;
  momentum: number;
  followUpUrgency: number;
};

export type ScoreBreakdownItem = {
  key: string;
  label: string;
  value: number;
  max: number;
  reason: string;
  direction: "plus" | "minus";
};

export type ServiceRecommendation = {
  service: OrbitaService;
  label: string;
  shortLabel: string;
  fitLabel: "encaje alto" | "encaje medio" | "encaje bajo";
  reason: string;
};

export type NextBestAction = {
  action: string;
  channel: string;
  reason: string;
  urgency: UrgencyLevel;
};

export type SuggestedMessages = {
  initial: string;
  followUp1: string;
  followUp2: string;
};

export type ProspectInsight = {
  score: number;
  tier: OpportunityTier;
  tierLabel: string;
  service: ServiceRecommendation;
  nextAction: NextBestAction;
  messages: SuggestedMessages;
  breakdown: ScoreBreakdownItem[];
  sectorLabel: string;
  cityLabel: string;
  isHot: boolean;
  needsFollowUp: boolean;
  dueToday: boolean;
};

export type ProspectRecord = {
  business: CombinedBusiness;
  insight: ProspectInsight;
};

export type TodayBuckets = {
  prioritizedToday: ProspectRecord[];
  followUpsPending: ProspectRecord[];
  hotLeads: ProspectRecord[];
  highPotentialUntouched: ProspectRecord[];
};

type SectorArchetype = {
  label: string;
  observation: string;
  pains: string[];
  keywords: string[];
  serviceBias: Record<OrbitaService, number>;
};

type ServiceMeta = {
  label: string;
  shortLabel: string;
  benefit: string;
};

const BASE_SCORE = 12;
const DEAD_LEAD_PENALTY = 34;

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  sectorFit: 22,
  contactability: 14,
  websiteGap: 10,
  decisionMaker: 10,
  prioritySignal: 12,
  momentum: 18,
  followUpUrgency: 14,
};

export const SCORING_RULES_META: Array<{
  key: keyof ScoringConfig;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
}> = [
  {
    key: "sectorFit",
    label: "Encaje sectorial",
    description: "Cuánto pesa que el tipo de negocio encaje con la propuesta de Orbita.",
    min: 0,
    max: 30,
    step: 1,
  },
  {
    key: "contactability",
    label: "Contactabilidad",
    description: "Cuánto valoras que haya teléfono o email disponibles para atacar rápido.",
    min: 0,
    max: 25,
    step: 1,
  },
  {
    key: "websiteGap",
    label: "Hueco digital",
    description: "Cuánto premias negocios con margen claro de mejora comercial o digital.",
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: "decisionMaker",
    label: "Acceso a decisor",
    description: "Cuánto influye tener dueño, cargo o contacto directo identificado.",
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: "prioritySignal",
    label: "Prioridad interna",
    description: "Cuánto pesa la prioridad marcada por vuestro equipo.",
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: "momentum",
    label: "Momento comercial",
    description: "Cuánto premias negocios que ya están respondiendo o avanzando.",
    min: 0,
    max: 25,
    step: 1,
  },
  {
    key: "followUpUrgency",
    label: "Urgencia de seguimiento",
    description: "Cuánto sube un lead si ya toca moverlo hoy.",
    min: 0,
    max: 20,
    step: 1,
  },
];

export const SERVICE_META: Record<OrbitaService, ServiceMeta> = {
  asistente_multicanal: {
    label: "Asistente/agente multicanal",
    shortLabel: "Agente multicanal",
    benefit: "captar y atender consultas entrantes sin perder oportunidades",
  },
  automatizacion_interna: {
    label: "Automatización interna",
    shortLabel: "Automatización",
    benefit: "reducir tareas repetitivas y acelerar la operación comercial",
  },
  avatar_ia: {
    label: "Vídeos con avatar IA",
    shortLabel: "Avatar IA",
    benefit: "explicar mejor la propuesta y generar más respuesta con un mensaje escalable",
  },
  saas_a_medida: {
    label: "SaaS a medida",
    shortLabel: "SaaS a medida",
    benefit: "crear una herramienta propia que ordene leads y operación de forma diferencial",
  },
};

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

const SECTOR_ARCHETYPES: SectorArchetype[] = [
  {
    label: "Restauración",
    observation: "suelen recibir muchas consultas repetidas sobre reservas, horarios y disponibilidad",
    pains: ["captación rápida", "respuesta inmediata", "gestión de reservas"],
    keywords: ["restaurant", "restaurante", "cafe", "cafeteria", "bar", "fast_food"],
    serviceBias: {
      asistente_multicanal: 26,
      automatizacion_interna: 8,
      avatar_ia: 14,
      saas_a_medida: 6,
    },
  },
  {
    label: "Salud",
    observation: "el primer contacto y la confianza pesan mucho en la conversión",
    pains: ["citas", "seguimiento", "respuesta a dudas frecuentes"],
    keywords: ["clinic", "clinica", "dent", "pharmacy", "hospital", "veterinary"],
    serviceBias: {
      asistente_multicanal: 24,
      automatizacion_interna: 10,
      avatar_ia: 18,
      saas_a_medida: 8,
    },
  },
  {
    label: "Estética",
    observation: "venden confianza, disponibilidad y una comunicación constante con el cliente",
    pains: ["captación local", "agenda", "seguimiento comercial"],
    keywords: ["beauty_salon", "hairdresser", "estetica", "salon"],
    serviceBias: {
      asistente_multicanal: 22,
      automatizacion_interna: 8,
      avatar_ia: 20,
      saas_a_medida: 7,
    },
  },
  {
    label: "Alojamiento",
    observation: "trabajan con mucha demanda entrante y ventanas cortas de respuesta",
    pains: ["consultas entrantes", "reservas", "atención fuera de horario"],
    keywords: ["hotel", "hostal", "hostel", "tourism", "alojamiento"],
    serviceBias: {
      asistente_multicanal: 25,
      automatizacion_interna: 10,
      avatar_ia: 12,
      saas_a_medida: 12,
    },
  },
  {
    label: "Inmobiliaria y servicios",
    observation: "necesitan mover leads, filtrar oportunidades y hacer seguimiento constante",
    pains: ["clasificación de leads", "seguimiento comercial", "operativa repetitiva"],
    keywords: ["real_estate", "inmobiliaria", "office", "agency", "bank", "gestoria", "asesoria"],
    serviceBias: {
      asistente_multicanal: 12,
      automatizacion_interna: 23,
      avatar_ia: 16,
      saas_a_medida: 18,
    },
  },
  {
    label: "Operación local",
    observation: "dependen de una operativa ágil y de responder presupuestos o incidencias a tiempo",
    pains: ["presupuestos", "seguimiento", "coordinación interna"],
    keywords: ["car_repair", "taller", "craft", "repair"],
    serviceBias: {
      asistente_multicanal: 15,
      automatizacion_interna: 24,
      avatar_ia: 8,
      saas_a_medida: 14,
    },
  },
];

function getBusinessText(business: CombinedBusiness) {
  return normalizeText([business.name, business.category, business.city].filter(Boolean).join(" "));
}

function getSectorArchetype(business: CombinedBusiness): SectorArchetype {
  const text = getBusinessText(business);
  return (
    SECTOR_ARCHETYPES.find((archetype) => archetype.keywords.some((keyword) => text.includes(normalizeText(keyword)))) ?? {
      label: business.category?.trim() || "Negocio local",
      observation: "tiene margen para mejorar su captación y seguimiento comercial",
      pains: ["captación", "seguimiento", "respuesta comercial"],
      keywords: [],
      serviceBias: {
        asistente_multicanal: 14,
        automatizacion_interna: 12,
        avatar_ia: 10,
        saas_a_medida: 10,
      },
    }
  );
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
  if (priority === "media") return 0.6;
  if (priority === "baja") return 0.2;
  return 0.35;
}

function getMomentumFactor(status: ProspectStatus) {
  const factors: Record<ProspectStatus, number> = {
    sin_contactar: 0.36,
    intento_contacto: 0.48,
    contactado: 0.65,
    reunion_agendada: 0.82,
    propuesta_enviada: 0.9,
    negociacion: 1,
    ganado: 0.25,
    perdido: 0.04,
    bloqueado: 0,
  };

  return factors[status];
}

function getSectorFitFactor(archetype: SectorArchetype) {
  const totalBias = Object.values(archetype.serviceBias).reduce((sum, current) => sum + current, 0);
  const maxBias = Math.max(...Object.values(archetype.serviceBias));
  if (totalBias <= 0) {
    return 0.45;
  }

  return clamp(maxBias / totalBias + 0.32, 0.45, 1);
}

function getContactabilityFactor(business: CombinedBusiness) {
  const businessRow = business.business;
  const contactSignals = [
    businessRow?.direct_phone,
    businessRow?.direct_email,
    businessRow?.phone ?? business.overpass?.phone,
    businessRow?.email ?? business.overpass?.email,
  ].filter(Boolean).length;

  if (contactSignals >= 3) return 1;
  if (contactSignals === 2) return 0.8;
  if (contactSignals === 1) return 0.5;
  return 0.12;
}

function getWebsiteGapFactor(business: CombinedBusiness) {
  const website = business.business?.website ?? business.overpass?.website;
  const openingHours = business.business?.opening_hours ?? business.overpass?.opening_hours;

  if (!website && openingHours) return 1;
  if (!website) return 0.82;
  if (website && !openingHours) return 0.52;
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
  return 0.08;
}

function getFollowUpUrgencyFactor(business: CombinedBusiness) {
  const daysSince = getDaysSince(business.lastInteractionAt);

  if (business.status === "ganado" || business.status === "perdido" || business.status === "bloqueado") {
    return 0;
  }

  if (business.status === "sin_contactar") {
    return business.priority === "alta" ? 0.55 : 0.28;
  }

  if (daysSince === null) {
    return 0.4;
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
  if (daysSince >= threshold) return 0.82;
  if (daysSince >= threshold - 1) return 0.56;
  return 0.18;
}

function getNonViablePenaltyFactor(status: ProspectStatus) {
  if (status === "bloqueado") return 1;
  if (status === "perdido") return 0.88;
  return 0;
}

function pickBestChannel(business: CombinedBusiness) {
  const channel = [
    {
      key: business.business?.direct_phone,
      label: "Llamada directa",
    },
    {
      key: business.business?.direct_email,
      label: "Email directo",
    },
    {
      key: business.business?.phone ?? business.overpass?.phone,
      label: "Llamada",
    },
    {
      key: business.business?.email ?? business.overpass?.email,
      label: "Email",
    },
    {
      key: business.business?.website ?? business.overpass?.website,
      label: "Formulario web",
    },
  ].find((entry) => Boolean(entry.key));

  return channel?.label ?? "Visita local";
}

function buildServiceRecommendation(
  business: CombinedBusiness,
  archetype: SectorArchetype,
  score: number,
): ServiceRecommendation {
  const scores: Record<OrbitaService, number> = {
    asistente_multicanal: archetype.serviceBias.asistente_multicanal,
    automatizacion_interna: archetype.serviceBias.automatizacion_interna,
    avatar_ia: archetype.serviceBias.avatar_ia,
    saas_a_medida: archetype.serviceBias.saas_a_medida,
  };

  const hasWebsite = Boolean(business.business?.website ?? business.overpass?.website);
  const hasOpeningHours = Boolean(business.business?.opening_hours ?? business.overpass?.opening_hours);
  const hasOwnerData = Boolean(business.business?.owner_name || business.business?.owner_role);
  const advancedStage = STATUS_RANK[business.status] >= STATUS_RANK.reunion_agendada;

  if (hasOpeningHours) {
    scores.asistente_multicanal += 8;
  }

  if (hasOwnerData) {
    scores.automatizacion_interna += 5;
    scores.saas_a_medida += 4;
  }

  if (hasWebsite) {
    scores.saas_a_medida += 8;
  } else {
    scores.avatar_ia += 5;
    scores.asistente_multicanal += 4;
  }

  if (advancedStage || score >= 80) {
    scores.saas_a_medida += 8;
  }

  if (business.status === "sin_contactar" && score >= 70) {
    scores.asistente_multicanal += 4;
    scores.avatar_ia += 3;
  }

  const chosen = ORBITA_SERVICES.reduce((best, current) => {
    return scores[current] > scores[best] ? current : best;
  }, ORBITA_SERVICES[0]);

  const serviceMeta = SERVICE_META[chosen];
  const fitLevel =
    scores[chosen] >= 28 ? "encaje alto" : scores[chosen] >= 18 ? "encaje medio" : "encaje bajo";

  const reasonParts = [
    `sector ${archetype.label.toLowerCase()}`,
    hasOpeningHours ? "alta demanda de respuesta" : null,
    hasWebsite && chosen === "saas_a_medida" ? "estructura digital aprovechable" : null,
    hasOwnerData ? "hay acceso parcial a decisor" : null,
  ].filter(Boolean);

  return {
    service: chosen,
    label: serviceMeta.label,
    shortLabel: serviceMeta.shortLabel,
    fitLabel: fitLevel,
    reason: `Recomendado por ${reasonParts.join(", ")}.`,
  };
}

function getTier(score: number): OpportunityTier {
  if (score >= 75) return "alta_oportunidad";
  if (score >= 50) return "media_oportunidad";
  return "baja_oportunidad";
}

function buildNextAction(
  business: CombinedBusiness,
  score: number,
  service: ServiceRecommendation,
): NextBestAction {
  const channel = pickBestChannel(business);
  const daysSince = getDaysSince(business.lastInteractionAt);
  const due = getFollowUpUrgencyFactor(business) >= 0.8;

  if (business.status === "bloqueado") {
    return {
      action: "No insistir y excluir de secuencias activas",
      channel,
      reason: "Está marcado como bloqueado y no conviene dedicar más energía comercial ahora.",
      urgency: "baja",
    };
  }

  if (business.status === "perdido") {
    return {
      action: "Archivar y revisar más adelante",
      channel,
      reason: "Lead cerrado como perdido. Solo merece reactivación futura si cambia el contexto.",
      urgency: "baja",
    };
  }

  if (business.status === "ganado") {
    return {
      action: "Detectar oportunidad de ampliación o referidos",
      channel,
      reason: "Ya es cliente. El siguiente paso útil es expansión, no prospección inicial.",
      urgency: "media",
    };
  }

  if (business.status === "sin_contactar") {
    return {
      action: `Abrir contacto con foco en ${service.shortLabel.toLowerCase()}`,
      channel,
      reason:
        score >= 75
          ? "Tiene alto potencial y conviene moverlo hoy con una propuesta clara."
          : "Todavía no se ha trabajado y ya hay señales suficientes para iniciar conversación.",
      urgency: score >= 75 ? "alta" : "media",
    };
  }

  if (business.status === "intento_contacto") {
    return {
      action: "Reintentar contacto con gancho más concreto",
      channel,
      reason:
        daysSince !== null && daysSince >= 3
          ? "El último intento ya está frío; conviene insistir con un beneficio directo."
          : "Sigue en fase temprana y necesita un segundo toque mejor enfocado.",
      urgency: due ? "alta" : "media",
    };
  }

  if (business.status === "contactado") {
    return {
      action: "Cerrar una reunión corta de diagnóstico",
      channel,
      reason: `Ya hubo contacto; el objetivo ahora es convertir interés en reunión para presentar ${service.shortLabel.toLowerCase()}.`,
      urgency: due ? "alta" : "media",
    };
  }

  if (business.status === "reunion_agendada") {
    return {
      action: "Preparar caso de uso y materiales específicos",
      channel,
      reason: "La reunión ya existe; lo crítico es llegar con una propuesta muy adaptada.",
      urgency: "alta",
    };
  }

  if (business.status === "propuesta_enviada") {
    return {
      action: "Hacer seguimiento de propuesta con objeción principal",
      channel,
      reason: "La propuesta ya está fuera. Toca provocar respuesta y resolver dudas.",
      urgency: due ? "alta" : "media",
    };
  }

  return {
    action: "Desbloquear objeciones y empujar cierre",
    channel,
    reason: "Está en negociación y hay que atacar fricciones para no perder timing.",
    urgency: "alta",
  };
}

function buildMessages(
  business: CombinedBusiness,
  archetype: SectorArchetype,
  service: ServiceRecommendation,
): SuggestedMessages {
  const name = business.name;
  const serviceBenefit = SERVICE_META[service.service].benefit;
  const pain = archetype.pains[0] ?? "captación y seguimiento";

  return {
    initial: `Hola ${name}, soy del equipo de Orbita. Hemos visto que en ${archetype.label.toLowerCase()} suele haber mucho desgaste en ${pain}. Creo que un ${service.label.toLowerCase()} puede ayudaros a ${serviceBenefit}. Si te encaja, te enseño en 15 minutos cómo lo plantearíamos para vuestro caso.`,
    followUp1: `Te escribo de nuevo por ${name}. La idea no es vender humo, sino enseñarte un enfoque concreto para mejorar ${pain} con ${service.shortLabel.toLowerCase()}. Si te parece, te paso dos ejemplos y vemos si tiene sentido hablar.`,
    followUp2: `Cierro este hilo por ahora. Si más adelante queréis ordenar mejor ${pain} o probar una solución tipo ${service.shortLabel.toLowerCase()}, en Orbita lo podemos aterrizar con una propuesta bastante práctica.`,
  };
}

export function getBusinessCityLabel(business: CombinedBusiness, fallbackCity?: string) {
  return business.city?.trim() || fallbackCity?.trim() || "Sin ciudad";
}

export function buildProspectInsight(
  business: CombinedBusiness,
  config: ScoringConfig,
  fallbackCity?: string,
): ProspectInsight {
  const archetype = getSectorArchetype(business);
  const sectorFit = getSectorFitFactor(archetype) * config.sectorFit;
  const contactability = getContactabilityFactor(business) * config.contactability;
  const websiteGap = getWebsiteGapFactor(business) * config.websiteGap;
  const decisionMaker = getDecisionMakerFactor(business) * config.decisionMaker;
  const prioritySignal = getPriorityFactor(business.priority) * config.prioritySignal;
  const momentum = getMomentumFactor(business.status) * config.momentum;
  const followUpUrgency = getFollowUpUrgencyFactor(business) * config.followUpUrgency;
  const deadLeadPenalty = getNonViablePenaltyFactor(business.status) * DEAD_LEAD_PENALTY;

  const scoreMax =
    BASE_SCORE +
    config.sectorFit +
    config.contactability +
    config.websiteGap +
    config.decisionMaker +
    config.prioritySignal +
    config.momentum +
    config.followUpUrgency;

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
  const tier = getTier(score);
  const service = buildServiceRecommendation(business, archetype, score);
  const nextAction = buildNextAction(business, score, service);
  const messages = buildMessages(business, archetype, service);
  const urgencyFactor = getFollowUpUrgencyFactor(business);
  const isHot = score >= 75 || STATUS_RANK[business.status] >= STATUS_RANK.reunion_agendada;
  const needsFollowUp =
    business.status !== "sin_contactar" &&
    business.status !== "ganado" &&
    business.status !== "perdido" &&
    business.status !== "bloqueado" &&
    urgencyFactor >= 0.56;
  const dueToday = needsFollowUp && urgencyFactor >= 0.82;

  return {
    score,
    tier,
    tierLabel: OPPORTUNITY_META[tier].label,
    service,
    nextAction,
    messages,
    breakdown: [
      {
        key: "sectorFit",
        label: "Encaje sectorial",
        value: Math.round(sectorFit * 10) / 10,
        max: config.sectorFit,
        reason: `Sector detectado: ${archetype.label}.`,
        direction: "plus",
      },
      {
        key: "contactability",
        label: "Contactabilidad",
        value: Math.round(contactability * 10) / 10,
        max: config.contactability,
        reason: "Premia la disponibilidad de teléfono, email o contacto directo.",
        direction: "plus",
      },
      {
        key: "websiteGap",
        label: "Hueco digital",
        value: Math.round(websiteGap * 10) / 10,
        max: config.websiteGap,
        reason: "Mide el margen visible de mejora comercial y digital.",
        direction: "plus",
      },
      {
        key: "decisionMaker",
        label: "Acceso a decisor",
        value: Math.round(decisionMaker * 10) / 10,
        max: config.decisionMaker,
        reason: "Sube si ya hay nombre, cargo o canal directo del decisor.",
        direction: "plus",
      },
      {
        key: "prioritySignal",
        label: "Prioridad interna",
        value: Math.round(prioritySignal * 10) / 10,
        max: config.prioritySignal,
        reason: "Refleja la prioridad marcada por vuestro equipo en la ficha.",
        direction: "plus",
      },
      {
        key: "momentum",
        label: "Momento comercial",
        value: Math.round(momentum * 10) / 10,
        max: config.momentum,
        reason: "Valora el estado actual del negocio dentro del embudo.",
        direction: "plus",
      },
      {
        key: "followUpUrgency",
        label: "Urgencia de seguimiento",
        value: Math.round(followUpUrgency * 10) / 10,
        max: config.followUpUrgency,
        reason: "Sube cuando toca actuar hoy o el lead empieza a enfriarse.",
        direction: "plus",
      },
      {
        key: "deadLeadPenalty",
        label: "Penalización por no viable",
        value: Math.round(deadLeadPenalty * 10) / 10,
        max: DEAD_LEAD_PENALTY,
        reason: "Perdido o bloqueado reducen casi todo el potencial comercial.",
        direction: "minus",
      },
    ],
    sectorLabel: archetype.label,
    cityLabel: getBusinessCityLabel(business, fallbackCity),
    isHot,
    needsFollowUp,
    dueToday,
  };
}

export function buildProspectRecords(
  businesses: CombinedBusiness[],
  config: ScoringConfig,
  fallbackCity?: string,
) {
  return businesses.map((business) => ({
    business,
    insight: buildProspectInsight(business, config, fallbackCity),
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

export function filterByBounds(record: ProspectRecord, bounds: { south: number; west: number; north: number; east: number }) {
  return (
    record.business.lat >= bounds.south &&
    record.business.lat <= bounds.north &&
    record.business.lng >= bounds.west &&
    record.business.lng <= bounds.east
  );
}

export function getUrgencyWeight(urgency: UrgencyLevel) {
  if (urgency === "alta") return 3;
  if (urgency === "media") return 2;
  return 1;
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

export function normalizeRankingFilters() {
  return {
    city: "all",
    sector: "all",
    status: "all",
    priority: "all",
  } as const;
}

export function isPriorityValue(value: string): value is PriorityLevel {
  return PRIORITY_OPTIONS.includes(value as PriorityLevel);
}
