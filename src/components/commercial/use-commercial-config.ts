"use client";

import { useEffect, useMemo, useState } from "react";

import {
  parseAccountSettingsRow,
  DEFAULT_COMMERCIAL_PREFERENCES,
  type AccountCommercialSettings,
  type CommercialPreferences,
  type ScoringConfig,
  type VerticalId,
} from "@/lib/prospect-intelligence";
import {
  readCommercialSettingsFromStorage,
  toAccountSettingsUpsert,
  writeCommercialSettingsToStorage,
} from "@/lib/commercial/account-settings";
import { buildDefaultCommercialSettings, getVerticalConfig } from "@/lib/commercial/verticals";
import { createClient } from "@/lib/supabase/client";
import { isMissingTableError } from "@/lib/supabase/error-helpers";

type SaveState = "idle" | "saving" | "saved" | "local_only" | "error";

export function useCommercialConfig(userId: string, fallbackVertical: VerticalId = "general_b2b") {
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<AccountCommercialSettings>(
    buildDefaultCommercialSettings(fallbackVertical),
  );
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [source, setSource] = useState<"default" | "local" | "remote">("default");
  const [tableAvailable, setTableAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const localSettings = readCommercialSettingsFromStorage(userId, fallbackVertical);
      if (!cancelled) {
        setSettings(localSettings);
        setSource("local");
      }

      const { data, error } = await supabase
        .from("account_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          if (isMissingTableError(error, "account_settings")) {
            setTableAvailable(false);
            setSaveState("local_only");
          }
          setReady(true);
          return;
        }

        const parsed = parseAccountSettingsRow(data, fallbackVertical);
        if (parsed) {
          setSettings(parsed);
          setSource("remote");
        }

        setReady(true);
      }
    };

    bootstrap().catch(() => {
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackVertical, supabase, userId]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    writeCommercialSettingsToStorage(userId, settings);

    const handle = window.setTimeout(async () => {
      if (!tableAvailable) {
        setSaveState("local_only");
        return;
      }

      setSaveState("saving");
      const { error } = await supabase
        .from("account_settings")
        .upsert(toAccountSettingsUpsert(userId, settings), { onConflict: "user_id" });

      if (error) {
        if (isMissingTableError(error, "account_settings")) {
          setTableAvailable(false);
          setSaveState("local_only");
          return;
        }

        setSaveState("error");
        return;
      }

      setSaveState("saved");
    }, 700);

    return () => {
      window.clearTimeout(handle);
    };
  }, [ready, settings, supabase, tableAvailable, userId]);

  const setVertical = (vertical: VerticalId) => {
    setSettings((current) => ({
      ...current,
      vertical,
      scoringConfig:
        current.vertical === vertical ? current.scoringConfig : { ...getVerticalConfig(vertical).scoringPreset },
    }));
  };

  const setDemoMode = (demoMode: boolean) => {
    setSettings((current) => ({
      ...current,
      demoMode,
    }));
  };

  const setScoringConfig = (scoringConfig: ScoringConfig) => {
    setSettings((current) => ({
      ...current,
      scoringConfig,
    }));
  };

  const setCommercialPreferences = (commercialPreferences: CommercialPreferences) => {
    setSettings((current) => ({
      ...current,
      commercialPreferences,
    }));
  };

  const resetScoringToVertical = () => {
    setSettings((current) => ({
      ...current,
      scoringConfig: { ...getVerticalConfig(current.vertical).scoringPreset },
      commercialPreferences: { ...DEFAULT_COMMERCIAL_PREFERENCES },
    }));
  };

  return {
    settings,
    ready,
    saveState,
    source,
    tableAvailable,
    setSettings,
    setVertical,
    setDemoMode,
    setScoringConfig,
    setCommercialPreferences,
    resetScoringToVertical,
  };
}
