"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { isMissingTableError } from "@/lib/supabase/error-helpers";
import type { ProspectListItemRow, ProspectListRow } from "@/lib/types";

type ListStatus = ProspectListRow["status"];

type CreateProspectListInput = {
  name: string;
  focus: string;
  status: ListStatus;
  serviceFocus?: ProspectListRow["service_focus"];
  cityFilter?: string | null;
  sectorFilter?: string | null;
  notes?: string | null;
  businessIds: string[];
};

function getListsErrorMessage() {
  return "No pude actualizar las campañas en este momento.";
}

function getListsUnavailableMessage() {
  return "Las campañas todavía no están disponibles en esta instalación.";
}

export function useProspectLists(userId: string) {
  const supabase = useMemo(() => createClient(), []);
  const [lists, setLists] = useState<ProspectListRow[]>([]);
  const [items, setItems] = useState<ProspectListItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableAvailable, setTableAvailable] = useState(true);

  const fetchState = useCallback(async () => {
    const [listsResponse, itemsResponse] = await Promise.all([
      supabase.from("prospect_lists").select("*").order("updated_at", { ascending: false }),
      supabase.from("prospect_list_items").select("*").order("created_at", { ascending: false }),
    ]);

    return {
      listsResponse,
      itemsResponse,
    };
  }, [supabase]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { listsResponse, itemsResponse } = await fetchState();

    const tableError = listsResponse.error ?? itemsResponse.error;
    if (tableError) {
      if (isMissingTableError(tableError, "prospect_lists") || isMissingTableError(tableError, "prospect_list_items")) {
        setTableAvailable(false);
        setLists([]);
        setItems([]);
        setLoading(false);
        return;
      }

      setError(getListsErrorMessage());
      setLoading(false);
      return;
    }

    setTableAvailable(true);
    setLists(listsResponse.data ?? []);
    setItems(itemsResponse.data ?? []);
    setLoading(false);
  }, [fetchState]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const { listsResponse, itemsResponse } = await fetchState();
        if (cancelled) {
          return;
        }

        const tableError = listsResponse.error ?? itemsResponse.error;
        if (tableError) {
          if (isMissingTableError(tableError, "prospect_lists") || isMissingTableError(tableError, "prospect_list_items")) {
            setTableAvailable(false);
            setLists([]);
            setItems([]);
            setLoading(false);
            return;
          }

          setError(getListsErrorMessage());
          setLoading(false);
          return;
        }

        setTableAvailable(true);
        setLists(listsResponse.data ?? []);
        setItems(itemsResponse.data ?? []);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("No pude cargar listas operativas.");
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [fetchState]);

  const createList = useCallback(
    async (input: CreateProspectListInput) => {
      if (!tableAvailable) {
        return { ok: false as const, error: getListsUnavailableMessage() };
      }

      const { data, error } = await supabase
        .from("prospect_lists")
        .insert({
          user_id: userId,
          name: input.name,
          focus: input.focus,
          status: input.status,
          service_focus: input.serviceFocus ?? null,
          city_filter: input.cityFilter ?? null,
          sector_filter: input.sectorFilter ?? null,
          notes: input.notes ?? null,
        })
        .select("*")
        .single();

      if (error || !data) {
        return { ok: false as const, error: getListsErrorMessage() };
      }

      if (input.businessIds.length > 0) {
        const payload = input.businessIds.map((businessId) => ({
          list_id: data.id,
          user_id: userId,
          business_id: businessId,
        }));

        const { error: itemsError } = await supabase.from("prospect_list_items").insert(payload);

        if (itemsError && itemsError.code !== "23505") {
          return { ok: false as const, error: getListsErrorMessage() };
        }
      }

      await load();
      return { ok: true as const, listId: data.id };
    },
    [load, supabase, tableAvailable, userId],
  );

  const addBusinessesToList = useCallback(
    async (listId: string, businessIds: string[]) => {
      if (!tableAvailable || businessIds.length === 0) {
        return { ok: true as const };
      }

      const payload = businessIds.map((businessId) => ({
        list_id: listId,
        user_id: userId,
        business_id: businessId,
      }));

      const { error } = await supabase.from("prospect_list_items").insert(payload);

      if (error && error.code !== "23505") {
        return { ok: false as const, error: getListsErrorMessage() };
      }

      await load();
      return { ok: true as const };
    },
    [load, supabase, tableAvailable, userId],
  );

  const updateList = useCallback(
    async (listId: string, patch: Partial<ProspectListRow>) => {
      if (!tableAvailable) {
        return { ok: false as const, error: getListsUnavailableMessage() };
      }

      const { error } = await supabase.from("prospect_lists").update(patch).eq("id", listId);
      if (error) {
        return { ok: false as const, error: getListsErrorMessage() };
      }

      await load();
      return { ok: true as const };
    },
    [load, supabase, tableAvailable],
  );

  return {
    lists,
    items,
    loading,
    error,
    tableAvailable,
    reload: load,
    createList,
    addBusinessesToList,
    updateList,
  };
}
