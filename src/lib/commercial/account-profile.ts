import type { AccountCommercialProfileRow } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

import type {
  AccountCommercialProfile,
  AccountKnowledgeSummary,
  OfferProfile,
  PricingProfile,
  ProspectingPreferencesProfile,
  IdealCustomerProfile,
} from "./types";

export const ACCOUNT_PROFILE_STORAGE_PREFIX = "prospectmap-account-profile-v1";

const SERVICE_KEYWORDS = [
  "asistente",
  "agente",
  "automatizacion",
  "whatsapp",
  "avatar",
  "video",
  "saas",
  "software",
  "crm",
  "embudos",
  "captacion",
];

const PAIN_KEYWORDS = [
  "problema",
  "dolor",
  "reto",
  "captacion",
  "respuesta",
  "seguimiento",
  "agenda",
  "recepcion",
  "conversion",
  "operacion",
  "reservas",
];

const OBJECTION_KEYWORDS = [
  "objec",
  "caro",
  "tiempo",
  "software",
  "automat",
  "equipo",
  "no queremos",
  "no necesitamos",
];

const VALUE_KEYWORDS = [
  "propuesta de valor",
  "valor",
  "beneficio",
  "convert",
  "ahorra",
  "retorno",
  "capta",
  "mejora",
];

const SEGMENT_KEYWORDS = [
  "autoescuela",
  "clinica",
  "hotel",
  "restaurante",
  "inmobiliaria",
  "taller",
  "b2b",
  "empresa",
  "pyme",
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function sanitizeIdealCustomerProfile(value: unknown): IdealCustomerProfile {
  if (!isObject(value)) {
    return {
      targetCustomer: "",
      targetGeographies: [],
      bestFitCompanyTraits: [],
      excludedCompanyTraits: [],
    };
  }

  return {
    targetCustomer: sanitizeString(value.targetCustomer),
    targetGeographies: sanitizeStringArray(value.targetGeographies),
    bestFitCompanyTraits: sanitizeStringArray(value.bestFitCompanyTraits),
    excludedCompanyTraits: sanitizeStringArray(value.excludedCompanyTraits),
  };
}

function sanitizeOfferProfile(value: unknown): OfferProfile {
  if (!isObject(value)) {
    return {
      whatYouSell: "",
      mainServices: [],
      secondaryServices: [],
      mainProblemSolved: "",
      valueProposition: "",
      typicalObjections: [],
      preferredCta: "",
      salesStyle: "",
      reviewBeforeContact: [],
      avoidTalkingPoints: [],
      recommendedAngles: [],
    };
  }

  return {
    whatYouSell: sanitizeString(value.whatYouSell),
    mainServices: sanitizeStringArray(value.mainServices),
    secondaryServices: sanitizeStringArray(value.secondaryServices),
    mainProblemSolved: sanitizeString(value.mainProblemSolved),
    valueProposition: sanitizeString(value.valueProposition),
    typicalObjections: sanitizeStringArray(value.typicalObjections),
    preferredCta: sanitizeString(value.preferredCta),
    salesStyle: sanitizeString(value.salesStyle),
    reviewBeforeContact: sanitizeStringArray(value.reviewBeforeContact),
    avoidTalkingPoints: sanitizeStringArray(value.avoidTalkingPoints),
    recommendedAngles: sanitizeStringArray(value.recommendedAngles),
  };
}

function sanitizePricingProfile(value: unknown): PricingProfile {
  if (!isObject(value)) {
    return {
      averagePriceRange: "",
      minimumDesiredTicket: "",
    };
  }

  return {
    averagePriceRange: sanitizeString(value.averagePriceRange),
    minimumDesiredTicket: sanitizeString(value.minimumDesiredTicket),
  };
}

function sanitizeProspectingPreferences(value: unknown): ProspectingPreferencesProfile {
  if (!isObject(value)) {
    return {
      preferredChannels: [],
      focusPriorities: [],
    };
  }

  return {
    preferredChannels: sanitizeStringArray(value.preferredChannels),
    focusPriorities: sanitizeStringArray(value.focusPriorities),
  };
}

function sanitizeKnowledgeSummary(value: unknown): AccountKnowledgeSummary {
  if (!isObject(value)) {
    return {
      detectedServices: [],
      detectedPainPoints: [],
      detectedObjections: [],
      detectedValueProps: [],
      detectedTargetSegments: [],
      sourceNote: "",
    };
  }

  return {
    detectedServices: sanitizeStringArray(value.detectedServices),
    detectedPainPoints: sanitizeStringArray(value.detectedPainPoints),
    detectedObjections: sanitizeStringArray(value.detectedObjections),
    detectedValueProps: sanitizeStringArray(value.detectedValueProps),
    detectedTargetSegments: sanitizeStringArray(value.detectedTargetSegments),
    sourceNote: sanitizeString(value.sourceNote),
  };
}

export function buildDefaultAccountCommercialProfile(): AccountCommercialProfile {
  return {
    sector: "",
    targetVerticals: [],
    targetSubsectors: [],
    idealCustomerProfile: sanitizeIdealCustomerProfile(null),
    offerProfile: sanitizeOfferProfile(null),
    pricingProfile: sanitizePricingProfile(null),
    prospectingPreferences: sanitizeProspectingPreferences(null),
    knowledgeBaseText: "",
    knowledgeSummary: sanitizeKnowledgeSummary(null),
    onboardingCompleted: false,
  };
}

export function sanitizeAccountCommercialProfile(
  input:
    | (Partial<
        Omit<
          AccountCommercialProfile,
          "idealCustomerProfile" | "offerProfile" | "pricingProfile" | "prospectingPreferences" | "knowledgeSummary"
        >
      > & {
        idealCustomerProfile?: unknown;
        offerProfile?: unknown;
        pricingProfile?: unknown;
        prospectingPreferences?: unknown;
        knowledgeSummary?: unknown;
      })
    | null
    | undefined,
): AccountCommercialProfile {
  const base = buildDefaultAccountCommercialProfile();

  return {
    sector: sanitizeString(input?.sector),
    targetVerticals: sanitizeStringArray(input?.targetVerticals),
    targetSubsectors: sanitizeStringArray(input?.targetSubsectors),
    idealCustomerProfile: sanitizeIdealCustomerProfile(input?.idealCustomerProfile),
    offerProfile: sanitizeOfferProfile(input?.offerProfile),
    pricingProfile: sanitizePricingProfile(input?.pricingProfile),
    prospectingPreferences: sanitizeProspectingPreferences(input?.prospectingPreferences),
    knowledgeBaseText: sanitizeString(input?.knowledgeBaseText),
    knowledgeSummary: sanitizeKnowledgeSummary(input?.knowledgeSummary),
    onboardingCompleted: typeof input?.onboardingCompleted === "boolean" ? input.onboardingCompleted : base.onboardingCompleted,
  };
}

export function parseAccountCommercialProfileRow(
  row: AccountCommercialProfileRow | null,
): AccountCommercialProfile | null {
  if (!row) {
    return null;
  }

  return sanitizeAccountCommercialProfile({
    sector: row.sector,
    targetVerticals: row.target_verticals,
    targetSubsectors: row.target_subsectors,
    idealCustomerProfile: row.ideal_customer_profile,
    offerProfile: row.offer_profile,
    pricingProfile: row.pricing_profile,
    prospectingPreferences: row.prospecting_preferences,
    knowledgeBaseText: row.knowledge_base_text,
    knowledgeSummary: row.knowledge_summary,
    onboardingCompleted: row.onboarding_completed,
  });
}

export function toAccountCommercialProfileUpsert(userId: string, profile: AccountCommercialProfile) {
  return {
    user_id: userId,
    sector: profile.sector,
    target_verticals: profile.targetVerticals,
    target_subsectors: profile.targetSubsectors,
    ideal_customer_profile: profile.idealCustomerProfile,
    offer_profile: profile.offerProfile,
    pricing_profile: profile.pricingProfile,
    prospecting_preferences: profile.prospectingPreferences,
    knowledge_base_text: profile.knowledgeBaseText,
    knowledge_summary: profile.knowledgeSummary,
    onboarding_completed: profile.onboardingCompleted,
  };
}

function detectSentences(rawText: string, keywords: string[]) {
  const sentences = rawText
    .split(/[\n\r]+|(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 20);

  return Array.from(
    new Set(
      sentences.filter((sentence) => {
        const normalized = normalizeText(sentence);
        return keywords.some((keyword) => normalized.includes(keyword));
      }),
    ),
  ).slice(0, 4);
}

function detectKeywords(rawText: string, keywords: string[]) {
  const normalized = normalizeText(rawText);

  return keywords
    .filter((keyword) => normalized.includes(keyword))
    .map((keyword) => keyword.replace(/_/g, " "))
    .slice(0, 6);
}

export function extractKnowledgeSummaryFromText(rawText: string): AccountKnowledgeSummary {
  const cleanedText = rawText.trim();

  if (!cleanedText) {
    return sanitizeKnowledgeSummary(null);
  }

  const detectedServices = detectSentences(cleanedText, SERVICE_KEYWORDS);
  const detectedPainPoints = detectSentences(cleanedText, PAIN_KEYWORDS);
  const detectedObjections = detectSentences(cleanedText, OBJECTION_KEYWORDS);
  const detectedValueProps = detectSentences(cleanedText, VALUE_KEYWORDS);
  const detectedTargetSegments = detectKeywords(cleanedText, SEGMENT_KEYWORDS);

  return {
    detectedServices,
    detectedPainPoints,
    detectedObjections,
    detectedValueProps,
    detectedTargetSegments,
    sourceNote: "Resumen heuristico generado localmente a partir del texto base subido o pegado.",
  };
}

export function applyKnowledgeSummaryToProfile(
  profile: AccountCommercialProfile,
  summary: AccountKnowledgeSummary,
) {
  return sanitizeAccountCommercialProfile({
    ...profile,
    targetSubsectors: profile.targetSubsectors.length > 0 ? profile.targetSubsectors : summary.detectedTargetSegments,
    offerProfile: {
      ...profile.offerProfile,
      mainServices:
        profile.offerProfile.mainServices.length > 0
          ? profile.offerProfile.mainServices
          : summary.detectedServices.slice(0, 3),
      mainProblemSolved:
        profile.offerProfile.mainProblemSolved || summary.detectedPainPoints[0] || profile.offerProfile.mainProblemSolved,
      valueProposition:
        profile.offerProfile.valueProposition || summary.detectedValueProps[0] || profile.offerProfile.valueProposition,
      typicalObjections:
        profile.offerProfile.typicalObjections.length > 0
          ? profile.offerProfile.typicalObjections
          : summary.detectedObjections.slice(0, 3),
    },
    knowledgeSummary: summary,
  });
}

export function readAccountCommercialProfileFromStorage(userId: string) {
  if (typeof window === "undefined") {
    return buildDefaultAccountCommercialProfile();
  }

  const raw = window.localStorage.getItem(`${ACCOUNT_PROFILE_STORAGE_PREFIX}:${userId}`);
  if (!raw) {
    return buildDefaultAccountCommercialProfile();
  }

  try {
    return sanitizeAccountCommercialProfile(JSON.parse(raw) as Partial<AccountCommercialProfile>);
  } catch {
    return buildDefaultAccountCommercialProfile();
  }
}

export function writeAccountCommercialProfileToStorage(userId: string, profile: AccountCommercialProfile) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${ACCOUNT_PROFILE_STORAGE_PREFIX}:${userId}`, JSON.stringify(profile));
}

export function isAccountCommercialProfileComplete(profile: AccountCommercialProfile | null | undefined) {
  if (!profile) {
    return false;
  }

  return Boolean(
    profile.sector.trim() &&
      profile.idealCustomerProfile.targetCustomer.trim() &&
      profile.offerProfile.whatYouSell.trim() &&
      profile.offerProfile.mainProblemSolved.trim() &&
      profile.offerProfile.valueProposition.trim(),
  );
}
