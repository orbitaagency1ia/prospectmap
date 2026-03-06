import { OVERPASS_CACHE_TTL_MS } from "@/lib/constants";
import { clamp, normalizeText } from "@/lib/utils";
import type { OverpassBusiness } from "@/lib/types";

type OverpassElement = {
  id: number;
  type: "node" | "way" | "relation";
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type CachedRecord = {
  value: OverpassBusiness[];
  expiresAt: number;
};

const overpassCache = new Map<string, CachedRecord>();
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function parseAddress(tags?: Record<string, string>) {
  if (!tags) return null;

  const street = tags["addr:street"];
  const number = tags["addr:housenumber"];
  if (street && number) return `${street} ${number}`;
  if (street) return street;
  return tags["addr:full"] ?? null;
}

function inferCategory(tags?: Record<string, string>) {
  if (!tags) return null;

  return tags.shop ?? tags.office ?? tags.amenity ?? tags.craft ?? tags.tourism ?? null;
}

function makeHeuristicKey(name: string, lat: number, lng: number) {
  return `${normalizeText(name)}::${lat.toFixed(4)}::${lng.toFixed(4)}`;
}

function getOverpassQuery({
  south,
  west,
  north,
  east,
}: {
  south: number;
  west: number;
  north: number;
  east: number;
}) {
  return `[out:json][timeout:25];
(
  node["name"]["shop"](${south},${west},${north},${east});
  way["name"]["shop"](${south},${west},${north},${east});
  relation["name"]["shop"](${south},${west},${north},${east});

  node["name"]["office"](${south},${west},${north},${east});
  way["name"]["office"](${south},${west},${north},${east});
  relation["name"]["office"](${south},${west},${north},${east});

  node["name"]["amenity"~"restaurant|bar|cafe|clinic|dentist|pharmacy|hospital|veterinary|bank|fast_food|car_repair|beauty_salon|hairdresser"](${south},${west},${north},${east});
  way["name"]["amenity"~"restaurant|bar|cafe|clinic|dentist|pharmacy|hospital|veterinary|bank|fast_food|car_repair|beauty_salon|hairdresser"](${south},${west},${north},${east});
  relation["name"]["amenity"~"restaurant|bar|cafe|clinic|dentist|pharmacy|hospital|veterinary|bank|fast_food|car_repair|beauty_salon|hairdresser"](${south},${west},${north},${east});
);
out center tags;`;
}

export async function fetchOverpassBusinesses(input: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<OverpassBusiness[]> {
  const south = clamp(input.south, -90, 90);
  const north = clamp(input.north, -90, 90);
  const west = clamp(input.west, -180, 180);
  const east = clamp(input.east, -180, 180);

  const cacheKey = `${south.toFixed(3)},${west.toFixed(3)},${north.toFixed(3)},${east.toFixed(3)}`;
  const cached = overpassCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const query = getOverpassQuery({ south, west, north, east });
  const headers = {
    "Content-Type": "text/plain;charset=UTF-8",
    "User-Agent": `ProspectMapMVP/1.0 (${process.env.PROSPECTMAP_CONTACT_EMAIL ?? "admin@example.com"})`,
  };

  let response: Response | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const current = await fetch(endpoint, {
      method: "POST",
      headers,
      body: query,
      cache: "no-store",
    });

    if (current.ok) {
      response = current;
      break;
    }
  }

  if (!response) {
    throw new Error("Overpass unavailable");
  }

  const payload = (await response.json()) as OverpassResponse;
  const elements = payload.elements ?? [];

  const byId = new Map<string, OverpassBusiness>();
  const byHeuristic = new Map<string, OverpassBusiness>();

  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = (tags.name ?? "").trim();

    if (!name) {
      continue;
    }

    const lat = element.type === "node" ? element.lat : element.center?.lat;
    const lng = element.type === "node" ? element.lon : element.center?.lon;

    if (typeof lat !== "number" || typeof lng !== "number") {
      continue;
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    const externalSourceId = `osm:${element.type}:${element.id}`;

    const business: OverpassBusiness = {
      source: "overpass",
      externalSourceId,
      name,
      category: inferCategory(tags),
      lat,
      lng,
      address: parseAddress(tags),
      city: tags["addr:city"] ?? tags["addr:town"] ?? null,
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      email: tags.email ?? tags["contact:email"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      opening_hours: tags.opening_hours ?? null,
    };

    byId.set(externalSourceId, business);

    const heuristicKey = makeHeuristicKey(name, lat, lng);
    if (!byHeuristic.has(heuristicKey)) {
      byHeuristic.set(heuristicKey, business);
    }
  }

  const businesses = Array.from(byHeuristic.values()).slice(0, 500);

  overpassCache.set(cacheKey, {
    value: businesses,
    expiresAt: Date.now() + OVERPASS_CACHE_TTL_MS,
  });

  return businesses;
}
