"use client";

import { useEffect, useState } from "react";

import { DEFAULT_SCORING_CONFIG, type ScoringConfig } from "@/lib/prospect-intelligence";

const STORAGE_KEY = "prospectmap-scoring-config-v1";

export function useScoringConfig() {
  const [config, setConfig] = useState<ScoringConfig>(DEFAULT_SCORING_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        setReady(true);
        return;
      }

      const parsed = JSON.parse(rawValue) as Partial<ScoringConfig>;
      setConfig({
        ...DEFAULT_SCORING_CONFIG,
        ...parsed,
      });
    } catch {
      setConfig(DEFAULT_SCORING_CONFIG);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config, ready]);

  const reset = () => {
    setConfig(DEFAULT_SCORING_CONFIG);
  };

  return {
    config,
    setConfig,
    reset,
    ready,
  };
}
