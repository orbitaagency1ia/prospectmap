import type { CombinedBusiness } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

import type {
  AccountCommercialSettings,
  CommercialPreferences,
  OrbitaService,
  ScoringConfig,
  VerticalConfig,
  VerticalId,
} from "./types";

export const DEFAULT_COMMERCIAL_PREFERENCES: CommercialPreferences = {
  preferredOutreach: "mixto",
  salesNarrative: "captacion",
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  sectorFit: 16,
  icpFit: 14,
  offerFit: 12,
  ticketFit: 8,
  contactability: 10,
  websiteGap: 8,
  decisionMaker: 8,
  prioritySignal: 10,
  momentum: 14,
  followUpUrgency: 10,
  needSignal: 10,
  potentialSignal: 10,
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
    description: "Cuánto pesa que el negocio encaje con la propuesta de Orbita para esta vertical.",
    min: 0,
    max: 24,
    step: 1,
  },
  {
    key: "icpFit",
    label: "Encaje ICP",
    description: "Mide el ajuste con el cliente ideal definido por la propia cuenta.",
    min: 0,
    max: 20,
    step: 1,
  },
  {
    key: "offerFit",
    label: "Compatibilidad de oferta",
    description: "Valora si lo que vende la cuenta encaja con el tipo de negocio detectado.",
    min: 0,
    max: 18,
    step: 1,
  },
  {
    key: "ticketFit",
    label: "Encaje de ticket",
    description: "Ajusta el score al ticket objetivo y al potencial percibido del negocio.",
    min: 0,
    max: 14,
    step: 1,
  },
  {
    key: "contactability",
    label: "Contactabilidad",
    description: "Premia teléfono, email o canales rápidos para atacar hoy.",
    min: 0,
    max: 18,
    step: 1,
  },
  {
    key: "websiteGap",
    label: "Hueco digital",
    description: "Valora si hay margen visible de mejora comercial o digital.",
    min: 0,
    max: 14,
    step: 1,
  },
  {
    key: "decisionMaker",
    label: "Acceso a decisor",
    description: "Sube cuando ya hay dueño, cargo o canal directo.",
    min: 0,
    max: 14,
    step: 1,
  },
  {
    key: "prioritySignal",
    label: "Prioridad interna",
    description: "Refuerza lo que el equipo de Orbita ya considera prioritario.",
    min: 0,
    max: 16,
    step: 1,
  },
  {
    key: "momentum",
    label: "Momento comercial",
    description: "Aumenta el peso del estado y de la temperatura del pipeline.",
    min: 0,
    max: 18,
    step: 1,
  },
  {
    key: "followUpUrgency",
    label: "Urgencia de follow-up",
    description: "Premia leads donde tocar hoy tiene sentido real.",
    min: 0,
    max: 16,
    step: 1,
  },
  {
    key: "needSignal",
    label: "Senal de necesidad",
    description: "Sube cuando hay dolor comercial visible o friccion operativa detectable.",
    min: 0,
    max: 18,
    step: 1,
  },
  {
    key: "potentialSignal",
    label: "Senal de potencial",
    description: "Sube cuando el negocio parece tener capacidad y contexto para la oferta.",
    min: 0,
    max: 18,
    step: 1,
  },
];

export const SERVICE_META: Record<
  OrbitaService,
  {
    label: string;
    shortLabel: string;
    benefit: string;
  }
> = {
  asistente_multicanal: {
    label: "Asistente/agente multicanal",
    shortLabel: "Agente multicanal",
    benefit: "captar y responder consultas sin perder oportunidades",
  },
  automatizacion_interna: {
    label: "Automatización interna",
    shortLabel: "Automatización",
    benefit: "quitar fricción operativa y acelerar procesos repetitivos",
  },
  avatar_ia: {
    label: "Vídeos con avatar IA",
    shortLabel: "Avatar IA",
    benefit: "presentar mejor la propuesta y generar respuesta con un mensaje escalable",
  },
  saas_a_medida: {
    label: "SaaS a medida",
    shortLabel: "SaaS a medida",
    benefit: "construir una herramienta propia que ordene leads y operación",
  },
};

export const VERTICAL_CONFIGS: Record<VerticalId, VerticalConfig> = {
  autoescuelas: {
    id: "autoescuelas",
    label: "Autoescuelas",
    shortLabel: "Autoescuelas",
    description: "Operativa centrada en matrículas, seguimiento de alumnos y respuesta rápida.",
    heroDescription: "Captación local, respuesta inmediata y agenda comercial simple.",
    focusHeadline: "Atacar negocios donde la velocidad de respuesta y la gestión de matrículas mueve la caja.",
    scoringPreset: {
      sectorFit: 18,
      icpFit: 14,
      offerFit: 12,
      ticketFit: 6,
      contactability: 12,
      websiteGap: 9,
      decisionMaker: 8,
      prioritySignal: 11,
      momentum: 12,
      followUpUrgency: 12,
      needSignal: 12,
      potentialSignal: 10,
    },
    inferenceKeywords: ["autoescuela", "driving_school", "permiso", "carnet"],
    serviceBoosts: {
      asistente_multicanal: 10,
      automatizacion_interna: 7,
      avatar_ia: 8,
      saas_a_medida: 3,
    },
    sectorPatterns: [
      {
        label: "Autoescuelas",
        keywords: ["autoescuela", "driving_school", "clases de conducir"],
        pains: ["responder leads de matrícula rápido", "seguir alumnos sin perder renovaciones", "ordenar consultas por WhatsApp y teléfono"],
        serviceBias: {
          asistente_multicanal: 26,
          automatizacion_interna: 16,
          avatar_ia: 18,
          saas_a_medida: 8,
        },
      },
    ],
    genericPains: [
      "la captación local depende de responder antes que la competencia",
      "hay demasiada consulta repetida y poco seguimiento estructurado",
      "la operativa comercial se mezcla con la agenda diaria",
    ],
    objectionLibrary: [
      {
        objection: "Ya atendemos esto por WhatsApp y teléfono.",
        response: "Justo por eso encaja: la propuesta es ordenar ese flujo y responder antes, no sustituir vuestra forma de trabajar.",
      },
      {
        objection: "No necesitamos más software ahora.",
        response: "No vendería software por venderlo. Primero buscamos quitar fugas de matrícula y tiempo operativo, y luego vemos la pieza mínima necesaria.",
      },
      {
        objection: "Ahora estamos a tope y no podemos cambiar nada.",
        response: "Cuando vais a tope es cuando más caro sale perder consultas. La idea es implantar algo ligero que os quite carga, no añadirla.",
      },
    ],
    messageHooks: {
      opening: "matrículas y respuesta rápida",
      differentiation: "menos fugas entre la primera consulta y la reserva de plaza",
      close: "si encaja, os enseñamos un caso aterrizado a autoescuelas",
    },
  },
  clinicas: {
    id: "clinicas",
    label: "Clínicas",
    shortLabel: "Clínicas",
    description: "Prospección pensada para clínicas, dentales y centros donde la agenda y la confianza son críticas.",
    heroDescription: "Agenda, atención, no-shows y seguimiento comercial medible.",
    focusHeadline: "Buscar clínicas con dolor claro en captación, agenda y tiempo de recepción.",
    scoringPreset: {
      sectorFit: 17,
      icpFit: 14,
      offerFit: 12,
      ticketFit: 8,
      contactability: 10,
      websiteGap: 8,
      decisionMaker: 10,
      prioritySignal: 10,
      momentum: 13,
      followUpUrgency: 11,
      needSignal: 13,
      potentialSignal: 10,
    },
    inferenceKeywords: ["clinic", "clinica", "dent", "odont", "medical", "salud", "fisioterapia"],
    serviceBoosts: {
      asistente_multicanal: 9,
      automatizacion_interna: 6,
      avatar_ia: 8,
      saas_a_medida: 4,
    },
    sectorPatterns: [
      {
        label: "Clínicas y salud",
        keywords: ["clinic", "clinica", "dent", "fisioterapia", "salud", "medical", "veterinary"],
        pains: ["llenar agenda sin sobrecargar recepción", "resolver dudas repetidas con rapidez", "hacer seguimiento para que no se enfríen los interesados"],
        serviceBias: {
          asistente_multicanal: 24,
          automatizacion_interna: 14,
          avatar_ia: 20,
          saas_a_medida: 10,
        },
      },
    ],
    genericPains: [
      "la recepción absorbe demasiadas dudas repetidas",
      "la primera respuesta tarda demasiado y eso enfría pacientes",
      "se pierden oportunidades entre la consulta inicial y la cita",
    ],
    objectionLibrary: [
      {
        objection: "La recepción ya se encarga de esto.",
        response: "La idea no es reemplazar recepción, sino descargar lo repetitivo para que el equipo llegue mejor a los casos que de verdad necesitan atención humana.",
      },
      {
        objection: "No queremos que parezca impersonal.",
        response: "Precisamente por eso proponemos una capa bien guionizada que filtra lo repetitivo y deja a vuestro equipo el trato sensible.",
      },
      {
        objection: "No sabemos si esto nos dará citas reales.",
        response: "La propuesta se enfoca en medir respuesta, citas y seguimiento. Si no impacta en agenda, no tendría sentido implantarla.",
      },
    ],
    messageHooks: {
      opening: "agenda, recepción y seguimiento",
      differentiation: "menos tiempo perdido en tareas repetidas y más capacidad para convertir interés en cita",
      close: "si os cuadra, os enseñamos cómo lo aterrizaríamos en una clínica",
    },
  },
  hoteles: {
    id: "hoteles",
    label: "Hoteles",
    shortLabel: "Hoteles",
    description: "Prospección enfocada en reservas, atención continua y captación directa.",
    heroDescription: "Reservas directas, respuesta omnicanal y menos dependencia del caos operativo.",
    focusHeadline: "Detectar hoteles donde una atención más rápida o una operación más ordenada sube conversión y margen.",
    scoringPreset: {
      sectorFit: 16,
      icpFit: 13,
      offerFit: 12,
      ticketFit: 9,
      contactability: 11,
      websiteGap: 7,
      decisionMaker: 9,
      prioritySignal: 9,
      momentum: 13,
      followUpUrgency: 12,
      needSignal: 12,
      potentialSignal: 12,
    },
    inferenceKeywords: ["hotel", "hostal", "hostel", "alojamiento", "apartahotel", "tourism"],
    serviceBoosts: {
      asistente_multicanal: 10,
      automatizacion_interna: 5,
      avatar_ia: 6,
      saas_a_medida: 6,
    },
    sectorPatterns: [
      {
        label: "Hoteles y alojamiento",
        keywords: ["hotel", "hostal", "hostel", "alojamiento", "tourism", "resort"],
        pains: ["responder reservas y dudas fuera de horario", "captar reserva directa", "ordenar la operación de atención comercial"],
        serviceBias: {
          asistente_multicanal: 28,
          automatizacion_interna: 12,
          avatar_ia: 12,
          saas_a_medida: 14,
        },
      },
    ],
    genericPains: [
      "se escapan reservas cuando la respuesta llega tarde",
      "hay mucho trabajo repetitivo en preguntas previas a la reserva",
      "la atención comercial depende demasiado de la disponibilidad del equipo",
    ],
    objectionLibrary: [
      {
        objection: "Ya trabajamos con Booking y otros canales.",
        response: "Precisamente por eso interesa subir la reserva directa y responder mejor al tráfico propio, no competir con vuestros canales sino rentabilizarlos más.",
      },
      {
        objection: "Recepción ya cubre las consultas.",
        response: "Recepción cubre mucho, pero si absorbe todo manualmente termina perdiendo tiempo y oportunidades de venta directa.",
      },
      {
        objection: "No queremos complicar la operativa del hotel.",
        response: "La propuesta va justo en la dirección contraria: simplificar atención y seguimiento con una capa mínima pero útil.",
      },
    ],
    messageHooks: {
      opening: "reserva directa y velocidad de respuesta",
      differentiation: "menos fugas entre la consulta inicial y la reserva",
      close: "si queréis, os enseño un enfoque muy concreto para hoteles",
    },
  },
  general_b2b: {
    id: "general_b2b",
    label: "General B2B",
    shortLabel: "General B2B",
    description: "Vertical comodín para servicios, oficinas y negocio B2B amplio.",
    heroDescription: "Más foco comercial, mejor seguimiento y mejor encaje entre lead y oferta.",
    focusHeadline: "Priorizar cuentas con más dolor operativo o comercial y una narrativa clara para vender Orbita.",
    scoringPreset: DEFAULT_SCORING_CONFIG,
    inferenceKeywords: ["office", "agency", "consult", "b2b", "empresa", "servicios"],
    serviceBoosts: {
      asistente_multicanal: 5,
      automatizacion_interna: 9,
      avatar_ia: 5,
      saas_a_medida: 9,
    },
    sectorPatterns: [
      {
        label: "Servicios B2B",
        keywords: ["office", "agency", "consult", "asesoria", "gestoria", "bank", "inmobiliaria", "real_estate"],
        pains: ["ordenar leads y seguimiento", "reducir tareas repetitivas", "tener una herramienta comercial más estructurada"],
        serviceBias: {
          asistente_multicanal: 14,
          automatizacion_interna: 24,
          avatar_ia: 12,
          saas_a_medida: 20,
        },
      },
    ],
    genericPains: [
      "el seguimiento comercial depende demasiado de disciplina manual",
      "hay procesos repetitivos que comen tiempo del equipo",
      "faltan herramientas propias para ordenar oportunidad y operación",
    ],
    objectionLibrary: [
      {
        objection: "Lo resolvemos con hojas de cálculo.",
        response: "Suele funcionar hasta que el volumen sube. La propuesta es quitar fricción y tener una capa más operativa sin complicar el equipo.",
      },
      {
        objection: "Ahora no es prioridad cambiar procesos.",
        response: "Justo por eso conviene empezar por un caso pequeño con impacto claro en captación o eficiencia.",
      },
      {
        objection: "No sabemos qué solución encaja mejor.",
        response: "La gracia de Orbita es no forzar una única pieza. Primero vemos si encaja automatización, agente, avatar o algo a medida.",
      },
    ],
    messageHooks: {
      opening: "captación, seguimiento y operación comercial",
      differentiation: "más foco comercial sin meter complejidad innecesaria",
      close: "si tiene sentido, lo aterrizamos a vuestro flujo real",
    },
  },
};

export function buildDefaultCommercialSettings(vertical: VerticalId = "general_b2b"): AccountCommercialSettings {
  return {
    vertical,
    demoMode: false,
    scoringConfig: { ...VERTICAL_CONFIGS[vertical].scoringPreset },
    commercialPreferences: { ...DEFAULT_COMMERCIAL_PREFERENCES },
  };
}

export function getVerticalConfig(vertical: VerticalId) {
  return VERTICAL_CONFIGS[vertical];
}

export function inferMarketVerticalId(business: CombinedBusiness): VerticalId {
  const text = normalizeText([business.name, business.category, business.city].filter(Boolean).join(" "));

  for (const vertical of Object.values(VERTICAL_CONFIGS)) {
    if (vertical.inferenceKeywords.some((keyword) => text.includes(normalizeText(keyword)))) {
      return vertical.id;
    }
  }

  return "general_b2b";
}

export function getVerticalLabel(vertical: VerticalId) {
  return VERTICAL_CONFIGS[vertical].label;
}
