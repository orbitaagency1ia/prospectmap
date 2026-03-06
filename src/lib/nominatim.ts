import { NOMINATIM_MIN_INTERVAL_MS } from "@/lib/constants";
import { clamp, safeNumber, sleep } from "@/lib/utils";
import type { CitySuggestion, GeocodeResult } from "@/lib/types";

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  addresstype?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
  };
};

type CacheRecord<T> = {
  expiresAt: number;
  value: T;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const cityCache = new Map<string, CacheRecord<CitySuggestion[]>>();
const addressCache = new Map<string, CacheRecord<GeocodeResult | null>>();

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function getHeaders() {
  const contactEmail = process.env.PROSPECTMAP_CONTACT_EMAIL ?? "admin@example.com";
  return {
    "User-Agent": `ProspectMapMVP/1.0 (${contactEmail})`,
    "Accept-Language": "es",
  };
}

function scheduleRequest<T>(task: () => Promise<T>) {
  const run = queue.then(async () => {
    const wait = Math.max(0, NOMINATIM_MIN_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) {
      await sleep(wait);
    }

    lastRequestAt = Date.now();
    return task();
  });

  queue = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

function sanitizeCity(raw?: string) {
  return (raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export async function searchCities(query: string, limitInput?: number): Promise<CitySuggestion[]> {
  const q = sanitizeCity(query);
  if (!q || q.length < 2) {
    return [];
  }

  const limit = clamp(Number(limitInput) || 6, 1, 8);
  const cacheKey = `${q.toLowerCase()}::${limit}`;
  const cached = cityCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "es");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("q", `${q}, España`);

  const response = await scheduleRequest(() =>
    fetch(url.toString(), {
      headers: getHeaders(),
      cache: "no-store",
    }),
  );

  if (!response.ok) {
    throw new Error("Nominatim city lookup failed");
  }

  const payload = (await response.json()) as NominatimItem[];
  const suggestions = payload
    .map((item) => {
      const lat = safeNumber(item.lat);
      const lng = safeNumber(item.lon);

      if (lat === null || lng === null) {
        return null;
      }

      const cityName =
        item.address?.city ??
        item.address?.town ??
        item.address?.village ??
        item.address?.municipality ??
        item.address?.county ??
        sanitizeCity(item.display_name.split(",")[0]);

      if (!cityName) {
        return null;
      }

      return {
        displayName: item.display_name,
        cityName,
        lat,
        lng,
      } satisfies CitySuggestion;
    })
    .filter((item): item is CitySuggestion => Boolean(item));

  cityCache.set(cacheKey, {
    value: suggestions,
    expiresAt: Date.now() + DAY_MS,
  });

  return suggestions;
}

export async function geocodeAddress(input: {
  address: string;
  city?: string | null;
}): Promise<GeocodeResult | null> {
  const address = input.address.trim().slice(0, 220);
  const city = (input.city ?? "").trim().slice(0, 120);
  if (!address) {
    return null;
  }

  const query = city ? `${address}, ${city}, España` : `${address}, España`;
  const cacheKey = query.toLowerCase();
  const cached = addressCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "es");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await scheduleRequest(() =>
    fetch(url.toString(), {
      headers: getHeaders(),
      cache: "no-store",
    }),
  );

  if (!response.ok) {
    throw new Error("Nominatim address lookup failed");
  }

  const payload = (await response.json()) as NominatimItem[];
  const item = payload[0];

  const lat = safeNumber(item?.lat);
  const lng = safeNumber(item?.lon);

  const value = lat === null || lng === null ? null : { lat, lng, displayName: item.display_name };

  addressCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + HOUR_MS,
  });

  return value;
}
