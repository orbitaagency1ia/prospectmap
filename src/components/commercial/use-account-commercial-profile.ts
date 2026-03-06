"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  buildDefaultAccountCommercialProfile,
  sanitizeAccountCommercialProfile,
  parseAccountCommercialProfileRow,
  readAccountCommercialProfileFromStorage,
  toAccountCommercialProfileUpsert,
  writeAccountCommercialProfileToStorage,
  type AccountCommercialProfile,
} from "@/lib/prospect-intelligence";

type SaveState = "idle" | "saving" | "saved" | "local_only" | "error";

export function useAccountCommercialProfile(userId: string) {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<AccountCommercialProfile>(buildDefaultAccountCommercialProfile());
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [tableAvailable, setTableAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const localProfile = readAccountCommercialProfileFromStorage(userId);
      if (!cancelled) {
        setProfile(localProfile);
      }

      const { data, error } = await supabase.from("account_profiles").select("*").eq("user_id", userId).maybeSingle();

      if (!cancelled) {
        if (error) {
          if (error.code === "42P01") {
            setTableAvailable(false);
          }
          setReady(true);
          return;
        }

        const parsed = parseAccountCommercialProfileRow(data);
        if (parsed) {
          setProfile(parsed);
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
  }, [supabase, userId]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    writeAccountCommercialProfileToStorage(userId, profile);

    const handle = window.setTimeout(async () => {
      if (!tableAvailable) {
        setSaveState("local_only");
        return;
      }

      setSaveState("saving");
      const { error } = await supabase.from("account_profiles").upsert(toAccountCommercialProfileUpsert(userId, profile));

      if (error) {
        if (error.code === "42P01") {
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
  }, [profile, ready, supabase, tableAvailable, userId]);

  const saveProfile = async (nextProfile: AccountCommercialProfile) => {
    const sanitized = sanitizeAccountCommercialProfile(nextProfile);
    setProfile(sanitized);
    writeAccountCommercialProfileToStorage(userId, sanitized);

    if (!tableAvailable) {
      setSaveState("local_only");
      return true;
    }

    setSaveState("saving");
    const { error } = await supabase.from("account_profiles").upsert(toAccountCommercialProfileUpsert(userId, sanitized));

    if (error) {
      if (error.code === "42P01") {
        setTableAvailable(false);
        setSaveState("local_only");
        return true;
      }

      setSaveState("error");
      return false;
    }

    setSaveState("saved");
    return true;
  };

  return {
    profile,
    setProfile,
    saveProfile,
    ready,
    saveState,
    tableAvailable,
  };
}
