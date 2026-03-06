import type { AccountSettingsRow } from "@/lib/types";

import type { AccountCommercialSettings, CommercialPreferences, ScoringConfig, VerticalId } from "./types";
import { buildDefaultCommercialSettings, DEFAULT_COMMERCIAL_PREFERENCES, getVerticalConfig } from "./verticals";

export const COMMERCIAL_SETTINGS_STORAGE_PREFIX = "prospectmap-commercial-settings-v3";
export const LEGACY_SCORING_STORAGE_KEY = "prospectmap-scoring-config-v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeScoringConfig(value: unknown, vertical: VerticalId): ScoringConfig {
  const fallback = getVerticalConfig(vertical).scoringPreset;
  if (!isObject(value)) {
    return { ...fallback };
  }

  return {
    sectorFit: typeof value.sectorFit === "number" ? value.sectorFit : fallback.sectorFit,
    contactability: typeof value.contactability === "number" ? value.contactability : fallback.contactability,
    websiteGap: typeof value.websiteGap === "number" ? value.websiteGap : fallback.websiteGap,
    decisionMaker: typeof value.decisionMaker === "number" ? value.decisionMaker : fallback.decisionMaker,
    prioritySignal: typeof value.prioritySignal === "number" ? value.prioritySignal : fallback.prioritySignal,
    momentum: typeof value.momentum === "number" ? value.momentum : fallback.momentum,
    followUpUrgency: typeof value.followUpUrgency === "number" ? value.followUpUrgency : fallback.followUpUrgency,
  };
}

function sanitizePreferences(value: unknown): CommercialPreferences {
  if (!isObject(value)) {
    return { ...DEFAULT_COMMERCIAL_PREFERENCES };
  }

  return {
    preferredOutreach:
      value.preferredOutreach === "llamada_primero" ||
      value.preferredOutreach === "email_primero" ||
      value.preferredOutreach === "mixto"
        ? value.preferredOutreach
        : DEFAULT_COMMERCIAL_PREFERENCES.preferredOutreach,
    salesNarrative:
      value.salesNarrative === "roi" || value.salesNarrative === "operacion" || value.salesNarrative === "captacion"
        ? value.salesNarrative
        : DEFAULT_COMMERCIAL_PREFERENCES.salesNarrative,
  };
}

export function sanitizeCommercialSettings(
  input:
    | (Partial<Omit<AccountCommercialSettings, "scoringConfig" | "commercialPreferences">> & {
        scoringConfig?: unknown;
        commercialPreferences?: unknown;
      })
    | null
    | undefined,
  fallbackVertical: VerticalId = "general_b2b",
): AccountCommercialSettings {
  const base = buildDefaultCommercialSettings(input?.vertical ?? fallbackVertical);

  return {
    vertical: input?.vertical ?? base.vertical,
    demoMode: typeof input?.demoMode === "boolean" ? input.demoMode : base.demoMode,
    scoringConfig: sanitizeScoringConfig(input?.scoringConfig, input?.vertical ?? base.vertical),
    commercialPreferences: sanitizePreferences(input?.commercialPreferences),
  };
}

export function parseAccountSettingsRow(
  row: AccountSettingsRow | null,
  fallbackVertical: VerticalId = "general_b2b",
): AccountCommercialSettings | null {
  if (!row) {
    return null;
  }

  return sanitizeCommercialSettings(
    {
      vertical: row.vertical,
      demoMode: row.demo_mode,
      scoringConfig: row.scoring_config,
      commercialPreferences: row.commercial_preferences,
    },
    fallbackVertical,
  );
}

export function toAccountSettingsUpsert(
  userId: string,
  settings: AccountCommercialSettings,
): {
  user_id: string;
  vertical: VerticalId;
  demo_mode: boolean;
  scoring_config: ScoringConfig;
  commercial_preferences: CommercialPreferences;
} {
  return {
    user_id: userId,
    vertical: settings.vertical,
    demo_mode: settings.demoMode,
    scoring_config: settings.scoringConfig,
    commercial_preferences: settings.commercialPreferences,
  };
}

export function readCommercialSettingsFromStorage(userId: string, fallbackVertical: VerticalId) {
  if (typeof window === "undefined") {
    return buildDefaultCommercialSettings(fallbackVertical);
  }

  const raw = window.localStorage.getItem(`${COMMERCIAL_SETTINGS_STORAGE_PREFIX}:${userId}`);
  if (raw) {
    try {
      return sanitizeCommercialSettings(JSON.parse(raw) as Partial<AccountCommercialSettings>, fallbackVertical);
    } catch {
      return buildDefaultCommercialSettings(fallbackVertical);
    }
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_SCORING_STORAGE_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw) as Partial<ScoringConfig>;
      return sanitizeCommercialSettings(
        {
          vertical: fallbackVertical,
          demoMode: false,
          scoringConfig: legacy,
          commercialPreferences: DEFAULT_COMMERCIAL_PREFERENCES,
        },
        fallbackVertical,
      );
    } catch {
      return buildDefaultCommercialSettings(fallbackVertical);
    }
  }

  return buildDefaultCommercialSettings(fallbackVertical);
}

export function writeCommercialSettingsToStorage(userId: string, settings: AccountCommercialSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${COMMERCIAL_SETTINGS_STORAGE_PREFIX}:${userId}`, JSON.stringify(settings));
}
