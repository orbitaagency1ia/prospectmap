"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { BusinessRow } from "@/lib/types";

type LatestNoteMap = Map<string, { text: string; createdAt: string }>;

export function useSavedProspects() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [latestNotes, setLatestNotes] = useState<LatestNoteMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    setLoading(true);
    setError(null);

    const [businessesResponse, notesResponse] = await Promise.all([
      supabase.from("businesses").select("*").order("updated_at", { ascending: false }),
      supabase
        .from("business_notes")
        .select("business_id,note_text,created_at")
        .order("created_at", { ascending: false })
        .limit(600),
    ]);

    if (businessesResponse.error) {
      setError("No pude cargar la actividad comercial en este momento.");
      setLoading(false);
      return;
    }

    setBusinesses(businessesResponse.data ?? []);

    if (notesResponse.error) {
      setLatestNotes(new Map());
      setLoading(false);
      return;
    }

    const noteMap = new Map<string, { text: string; createdAt: string }>();

    (notesResponse.data ?? []).forEach((note) => {
      if (!noteMap.has(note.business_id)) {
        noteMap.set(note.business_id, {
          text: note.note_text,
          createdAt: note.created_at,
        });
      }
    });

    setLatestNotes(noteMap);
    setLoading(false);
  };

  useEffect(() => {
    const supabase = createClient();

    const initialize = async () => {
      const [businessesResponse, notesResponse] = await Promise.all([
        supabase.from("businesses").select("*").order("updated_at", { ascending: false }),
        supabase
          .from("business_notes")
          .select("business_id,note_text,created_at")
          .order("created_at", { ascending: false })
          .limit(600),
      ]);

      if (businessesResponse.error) {
        setError("No pude cargar la actividad comercial en este momento.");
        setLoading(false);
        return;
      }

      setBusinesses(businessesResponse.data ?? []);

      const noteMap = new Map<string, { text: string; createdAt: string }>();
      (notesResponse.data ?? []).forEach((note) => {
        if (!noteMap.has(note.business_id)) {
          noteMap.set(note.business_id, {
            text: note.note_text,
            createdAt: note.created_at,
          });
        }
      });

      setLatestNotes(noteMap);
      setLoading(false);
    };

    initialize().catch(() => {
      setError("No pude cargar negocios guardados.");
      setLoading(false);
    });
  }, []);

  return {
    businesses,
    latestNotes,
    loading,
    error,
    reload: load,
  };
}
