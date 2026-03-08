"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ATTACK_RESULT_OPTIONS,
  buildBusinessUpdateFromAttackResult,
  type AttackNextStepSuggestion,
  type AttackQueueEntry,
  type AttackResultKind,
} from "@/lib/prospect-intelligence";
import {
  buildPriorityChangeText,
  buildStatusChangeText,
  logBusinessEvent,
} from "@/lib/commercial/business-events";
import type { Database, Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { isMissingTableError } from "@/lib/supabase/error-helpers";
import type { AttackResultRow, AttackSessionItemRow, AttackSessionRow } from "@/lib/types";

type SaveResultInput = {
  record: AttackQueueEntry;
  result: AttackResultKind;
  noteText: string;
  followUpAt?: string | null;
  priority?: "alta" | "media" | "baja" | null;
  suggestion?: AttackNextStepSuggestion | null;
  moveToPipeline?: boolean;
  discard?: boolean;
  listId?: string | null;
};

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function isSameDay(value?: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

export function useAttackSession(userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<AttackSessionRow | null>(null);
  const [items, setItems] = useState<AttackSessionItemRow[]>([]);
  const [resultsToday, setResultsToday] = useState<AttackResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableAvailable, setTableAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const sessionResponse = await supabase
      .from("attack_sessions")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(12);

    if (sessionResponse.error) {
      if (isMissingTableError(sessionResponse.error, "attack_sessions")) {
        setTableAvailable(false);
        setSession(null);
        setItems([]);
        setResultsToday([]);
        setLoading(false);
        return;
      }

      setError("No pude preparar la sesión de ataque.");
      setLoading(false);
      return;
    }

    setTableAvailable(true);
    const sessions = sessionResponse.data ?? [];
    const activeSession =
      sessions.find((entry) => isSameDay(entry.started_at) && (entry.status === "active" || entry.status === "paused")) ??
      sessions.find((entry) => entry.status === "active" || entry.status === "paused") ??
      null;

    setSession(activeSession);

    const [itemsResponse, resultsResponse] = await Promise.all([
      activeSession
        ? supabase
            .from("attack_session_items")
            .select("*")
            .eq("session_id", activeSession.id)
            .order("position", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("attack_results")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startOfTodayIso())
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

    if (itemsResponse.error || resultsResponse.error) {
      setError("No pude cargar la actividad de ataque.");
      setLoading(false);
      return;
    }

    setItems(itemsResponse.data ?? []);
    setResultsToday(resultsResponse.data ?? []);
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [load]);

  const createSession = useCallback(
    async (input: {
      name: string;
      source: AttackSessionRow["source"];
      sourceRef?: string | null;
      filtersSnapshot: Json;
      entries: AttackQueueEntry[];
    }) => {
      if (!tableAvailable) {
        return { ok: false as const, error: "El módulo de ataque aún no está disponible en esta instalación." };
      }

      setBusy(true);
      setError(null);

      const { data: createdSession, error: sessionError } = await supabase
        .from("attack_sessions")
        .insert({
          user_id: userId,
          name: input.name,
          source: input.source,
          source_ref: input.sourceRef ?? null,
          queue_filters: input.filtersSnapshot,
          status: "active",
        })
        .select("*")
        .single();

      if (sessionError || !createdSession) {
        setBusy(false);
        return { ok: false as const, error: "No pude iniciar la sesión de ataque." };
      }

      const payload = input.entries.map((entry, index) => ({
        session_id: createdSession.id,
        user_id: userId,
        business_id: entry.businessId,
        position: index,
        queue_reason: entry.queueReason,
        why_today: entry.whyToday,
        zone_key: entry.zoneKey,
        zone_label: entry.zoneLabel,
        status: index === 0 ? "in_progress" : "pending",
      })) satisfies Database["public"]["Tables"]["attack_session_items"]["Insert"][];

      const { error: itemsError } = await supabase.from("attack_session_items").insert(payload);

      if (itemsError) {
        setBusy(false);
        return { ok: false as const, error: "No pude preparar la cola de ataque." };
      }

      await load();
      setBusy(false);
      return { ok: true as const, sessionId: createdSession.id };
    },
    [load, supabase, tableAvailable, userId],
  );

  const updateSession = useCallback(
    async (patch: Partial<AttackSessionRow>) => {
      if (!session) {
        return { ok: false as const, error: "No hay sesión activa." };
      }

      const { error: updateError } = await supabase.from("attack_sessions").update(patch).eq("id", session.id);
      if (updateError) {
        return { ok: false as const, error: "No pude actualizar la sesión." };
      }

      await load();
      return { ok: true as const };
    },
    [load, session, supabase],
  );

  const setCurrentItem = useCallback(
    async (itemId: string) => {
      if (!session) {
        return;
      }

      setBusy(true);
      const currentInProgress = items.find((item) => item.status === "in_progress");
      if (currentInProgress && currentInProgress.id !== itemId) {
        await supabase
          .from("attack_session_items")
          .update({ status: "pending" })
          .eq("id", currentInProgress.id);
      }

      await supabase
        .from("attack_session_items")
        .update({ status: "in_progress" })
        .eq("id", itemId);

      await load();
      setBusy(false);
    },
    [items, load, session, supabase],
  );

  const moveToEnd = useCallback(
    async (itemId: string) => {
      if (!session) {
        return { ok: false as const, error: "No hay sesión activa." };
      }

      setBusy(true);
      const maxPosition = Math.max(...items.map((item) => item.position), 0) + 1;
      const { error: updateError } = await supabase
        .from("attack_session_items")
        .update({ position: maxPosition, status: "pending" })
        .eq("id", itemId);

      if (updateError) {
        setBusy(false);
        return { ok: false as const, error: "No pude mover el lead al final." };
      }

      await load();
      setBusy(false);
      return { ok: true as const };
    },
    [items, load, session, supabase],
  );

  const updateItemStatus = useCallback(
    async (itemId: string, status: AttackSessionItemRow["status"]) => {
      setBusy(true);
      const { error: updateError } = await supabase
        .from("attack_session_items")
        .update({ status, last_worked_at: status === "worked" ? new Date().toISOString() : null })
        .eq("id", itemId);

      if (updateError) {
        setBusy(false);
        return { ok: false as const, error: "No pude actualizar ese lead en la sesión." };
      }

      await load();
      setBusy(false);
      return { ok: true as const };
    },
    [load, supabase],
  );

  const togglePin = useCallback(
    async (itemId: string, pinned: boolean) => {
      setBusy(true);
      const { error: updateError } = await supabase
        .from("attack_session_items")
        .update({ pinned_for_today: pinned })
        .eq("id", itemId);

      if (updateError) {
        setBusy(false);
        return { ok: false as const, error: "No pude fijar ese lead para hoy." };
      }

      await load();
      setBusy(false);
      return { ok: true as const };
    },
    [load, supabase],
  );

  const saveResult = useCallback(
    async (input: SaveResultInput) => {
      if (!input.record.business.business) {
        return { ok: false as const, error: "Solo puedes trabajar negocios ya guardados." };
      }

      setBusy(true);
      setError(null);

      const patch = buildBusinessUpdateFromAttackResult({
        result: input.result,
        currentStatus: input.record.business.status,
        currentPriority: input.record.business.priority,
        followUpAt: input.followUpAt,
        overridePriority: input.priority ?? null,
        suggestion: input.suggestion,
      });

      const { error: updateBusinessError } = await supabase
        .from("businesses")
        .update({
          prospect_status: patch.prospect_status,
          priority: patch.priority,
          last_contact_at: patch.last_contact_at,
          next_follow_up_at: patch.next_follow_up_at,
        })
        .eq("id", input.record.businessId);

      if (updateBusinessError) {
        setBusy(false);
        return { ok: false as const, error: "No pude actualizar el lead trabajado." };
      }

      if (input.noteText.trim()) {
        const { error: noteError } = await supabase.from("business_notes").insert({
          user_id: userId,
          business_id: input.record.businessId,
          note_text: input.noteText.trim(),
        });

        if (noteError) {
          setBusy(false);
          return { ok: false as const, error: "No pude guardar la nota de resultado." };
        }
      }

      if (input.listId) {
        const { error: listError } = await supabase.from("prospect_list_items").insert({
          user_id: userId,
          list_id: input.listId,
          business_id: input.record.businessId,
        });

        if (listError && listError.code !== "23505") {
          setBusy(false);
          return { ok: false as const, error: "No pude añadir el lead a la campaña elegida." };
        }
      }

      const sessionItem = items.find((item) => item.business_id === input.record.businessId);
      const nextItemStatus = input.discard || input.result === "no_encaja" || input.result === "perdido" ? "dismissed" : "worked";

      const { error: resultError } = await supabase.from("attack_results").insert({
        user_id: userId,
        session_id: session?.id ?? null,
        session_item_id: sessionItem?.id ?? null,
        business_id: input.record.businessId,
        result: input.result,
        note_text: input.noteText.trim() || null,
        follow_up_at: patch.next_follow_up_at ?? null,
        priority_after: patch.priority ?? null,
        suggested_next_step: input.suggestion?.label ?? null,
        suggested_due_at: input.suggestion?.dueAt ?? null,
        moved_to_pipeline: Boolean(input.moveToPipeline || input.suggestion?.moveToPipeline),
        added_to_list_id: input.listId || null,
        discarded: Boolean(input.discard || input.suggestion?.archive),
      });

      if (resultError) {
        setBusy(false);
        return { ok: false as const, error: "No pude registrar el resultado de este lead." };
      }

      const resultLabel = ATTACK_RESULT_OPTIONS.find((option) => option.id === input.result)?.label ?? "Resultado";
      const previousStatus = input.record.business.status;
      const nextStatus = patch.prospect_status ?? previousStatus;
      const previousPriority = input.record.business.priority ?? null;
      const nextPriority = patch.priority ?? previousPriority;

      await logBusinessEvent(supabase, {
        userId,
        businessId: input.record.businessId,
        type: "attack_result_logged",
        title: `Ataque · ${resultLabel}`,
        details: input.suggestion?.label ?? "Resultado guardado desde Attack Workspace.",
        metadata: {
          result: input.result,
          suggestion: input.suggestion?.label ?? null,
          moved_to_pipeline: Boolean(input.moveToPipeline || input.suggestion?.moveToPipeline),
          discarded: Boolean(input.discard || input.suggestion?.archive),
        },
      });

      if (previousStatus !== nextStatus) {
        await logBusinessEvent(supabase, {
          userId,
          businessId: input.record.businessId,
          type: "status_changed",
          details: buildStatusChangeText(previousStatus, nextStatus),
          metadata: {
            previous_status: previousStatus,
            next_status: nextStatus,
          },
        });
      }

      if (previousPriority !== nextPriority) {
        await logBusinessEvent(supabase, {
          userId,
          businessId: input.record.businessId,
          type: "priority_changed",
          details: buildPriorityChangeText(previousPriority, nextPriority),
          metadata: {
            previous_priority: previousPriority,
            next_priority: nextPriority,
          },
        });
      }

      if (patch.next_follow_up_at) {
        await logBusinessEvent(supabase, {
          userId,
          businessId: input.record.businessId,
          type: "follow_up_scheduled",
          details: "Seguimiento programado tras resultado de ataque.",
          metadata: {
            next_follow_up_at: patch.next_follow_up_at,
          },
        });
      }

      if (sessionItem) {
        const { error: itemError } = await supabase
          .from("attack_session_items")
          .update({ status: nextItemStatus, last_worked_at: new Date().toISOString() })
          .eq("id", sessionItem.id);

        if (itemError) {
          setBusy(false);
          return { ok: false as const, error: "No pude cerrar el lead dentro de la sesión." };
        }
      }

      if (session) {
        const remaining = items.filter(
          (item) =>
            item.id !== sessionItem?.id &&
            (item.status === "pending" || item.status === "in_progress"),
        ).length;

        if (remaining === 0) {
          await supabase
            .from("attack_sessions")
            .update({ status: "completed", ended_at: new Date().toISOString() })
            .eq("id", session.id);
        }
      }

      await load();
      setBusy(false);
      return { ok: true as const };
    },
    [items, load, session, supabase, userId],
  );

  return {
    session,
    items,
    resultsToday,
    loading,
    error,
    busy,
    tableAvailable,
    reload: load,
    createSession,
    updateSession,
    setCurrentItem,
    moveToEnd,
    updateItemStatus,
    togglePin,
    saveResult,
  };
}
