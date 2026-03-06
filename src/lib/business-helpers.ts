import {
  PROSPECT_STATUS_ORDER,
  type PriorityLevel,
  type ProspectStatus,
} from "@/lib/constants";
import type { BusinessRow, CombinedBusiness, OverpassBusiness } from "@/lib/types";
import { normalizeText } from "@/lib/utils";

export type BusinessFilters = {
  category: string;
  status: ProspectStatus | "all";
  priority: PriorityLevel | "all";
};

export const DEFAULT_FILTERS: BusinessFilters = {
  category: "all",
  status: "all",
  priority: "all",
};

export function makeHeuristicBusinessKey(name: string, lat: number, lng: number) {
  return `${normalizeText(name)}::${lat.toFixed(4)}::${lng.toFixed(4)}`;
}

export function getStatus(value?: string | null): ProspectStatus {
  if (!value) {
    return "sin_contactar";
  }

  if (PROSPECT_STATUS_ORDER.includes(value as ProspectStatus)) {
    return value as ProspectStatus;
  }

  return "sin_contactar";
}

export function mergeBusinesses(input: {
  savedBusinesses: BusinessRow[];
  overpassBusinesses: OverpassBusiness[];
  latestNotes: Map<string, { text: string; createdAt: string }>;
}): CombinedBusiness[] {
  const { savedBusinesses, overpassBusinesses, latestNotes } = input;

  const combined: CombinedBusiness[] = [];

  const byExternalId = new Map<string, BusinessRow>();
  const byHeuristic = new Map<string, BusinessRow>();

  for (const business of savedBusinesses) {
    if (business.external_source_id) {
      byExternalId.set(business.external_source_id, business);
    }

    byHeuristic.set(makeHeuristicBusinessKey(business.name, business.lat, business.lng), business);

    const note = latestNotes.get(business.id);

    combined.push({
      key: `saved:${business.id}`,
      mode: "saved",
      worked: true,
      name: business.name,
      category: business.category,
      city: business.city,
      lat: business.lat,
      lng: business.lng,
      status: getStatus(business.prospect_status),
      priority: business.priority,
      business,
      overpass: null,
      lastInteractionAt: note?.createdAt ?? business.last_contact_at ?? business.updated_at,
      latestNote: note?.text ?? null,
    });
  }

  for (const business of overpassBusinesses) {
    const fromExternal = byExternalId.get(business.externalSourceId);
    if (fromExternal) {
      continue;
    }

    const heurKey = makeHeuristicBusinessKey(business.name, business.lat, business.lng);
    if (byHeuristic.has(heurKey)) {
      continue;
    }

    combined.push({
      key: `overpass:${business.externalSourceId}`,
      mode: "overpass",
      worked: false,
      name: business.name,
      category: business.category,
      city: business.city,
      lat: business.lat,
      lng: business.lng,
      status: "sin_contactar",
      priority: null,
      business: null,
      overpass: business,
      lastInteractionAt: null,
      latestNote: null,
    });
  }

  return combined;
}

export function applyFilters(businesses: CombinedBusiness[], filters: BusinessFilters) {
  return businesses.filter((business) => {
    if (filters.category !== "all") {
      const category = normalizeText(business.category);
      if (category !== normalizeText(filters.category)) {
        return false;
      }
    }

    if (filters.status !== "all" && business.status !== filters.status) {
      return false;
    }

    if (filters.priority !== "all") {
      if (!business.priority || business.priority !== filters.priority) {
        return false;
      }
    }

    return true;
  });
}

export function buildCategoryOptions(businesses: CombinedBusiness[]) {
  const unique = new Set<string>();

  businesses.forEach((business) => {
    if (business.category?.trim()) {
      unique.add(business.category.trim());
    }
  });

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "es"));
}
