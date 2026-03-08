import type { SupabaseClient } from "@supabase/supabase-js";

import { STATUS_META, type PriorityLevel, type ProspectStatus } from "@/lib/constants";
import type { Database, Json } from "@/lib/database.types";
import { isMissingTableError } from "@/lib/supabase/error-helpers";

export type BusinessEventType =
  | "business_saved"
  | "business_updated"
  | "status_changed"
  | "priority_changed"
  | "follow_up_scheduled"
  | "note_added"
  | "attack_result_logged";

export const BUSINESS_EVENT_LABELS: Record<BusinessEventType, string> = {
  business_saved: "Negocio guardado",
  business_updated: "Ficha actualizada",
  status_changed: "Estado actualizado",
  priority_changed: "Prioridad actualizada",
  follow_up_scheduled: "Follow-up programado",
  note_added: "Nota añadida",
  attack_result_logged: "Resultado de ataque registrado",
};

function normalizeIso(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function buildStatusChangeText(previous: ProspectStatus, next: ProspectStatus) {
  return `${STATUS_META[previous].label} → ${STATUS_META[next].label}`;
}

export function buildPriorityChangeText(previous: PriorityLevel | null, next: PriorityLevel | null) {
  const format = (value: PriorityLevel | null) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Sin prioridad");
  return `${format(previous)} → ${format(next)}`;
}

export function parseFollowUpIso(value?: string | null) {
  return normalizeIso(value);
}

export async function logBusinessEvent(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string;
    businessId: string;
    type: BusinessEventType;
    title?: string;
    details?: string | null;
    metadata?: Json;
  },
) {
  const { error } = await supabase.from("business_events").insert({
    user_id: input.userId,
    business_id: input.businessId,
    event_type: input.type,
    title: input.title ?? BUSINESS_EVENT_LABELS[input.type],
    details: input.details ?? null,
    metadata: input.metadata ?? {},
  });

  if (!error) {
    return { ok: true as const };
  }

  if (isMissingTableError(error, "business_events")) {
    return { ok: false as const, skipped: true as const, reason: "missing_table" as const };
  }

  return { ok: false as const, skipped: false as const, reason: "insert_error" as const };
}

