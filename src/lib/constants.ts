export const PROSPECT_STATUS_ORDER = [
  "sin_contactar",
  "intento_contacto",
  "contactado",
  "reunion_agendada",
  "propuesta_enviada",
  "negociacion",
  "ganado",
  "perdido",
  "bloqueado",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUS_ORDER)[number];

export const PRIORITY_OPTIONS = ["alta", "media", "baja"] as const;
export type PriorityLevel = (typeof PRIORITY_OPTIONS)[number];

export const STATUS_META: Record<
  ProspectStatus,
  {
    label: string;
    badgeClass: string;
    markerColor: string;
    legend: string;
    isNonViable?: boolean;
    hasLockIcon?: boolean;
  }
> = {
  sin_contactar: {
    label: "Sin contactar",
    badgeClass: "bg-slate-700 text-slate-100 border border-slate-600",
    markerColor: "#9ca3af",
    legend: "No trabajado",
  },
  intento_contacto: {
    label: "Intento de contacto",
    badgeClass: "bg-amber-500/20 text-amber-200 border border-amber-400/70",
    markerColor: "#f59e0b",
    legend: "Intentando contactar",
  },
  contactado: {
    label: "Contactado",
    badgeClass: "bg-amber-500/18 text-amber-100 border border-amber-300/70",
    markerColor: "#fbbf24",
    legend: "Primer contacto logrado",
  },
  reunion_agendada: {
    label: "Reunión agendada",
    badgeClass: "bg-violet-500/20 text-violet-100 border border-violet-400/70",
    markerColor: "#8b5cf6",
    legend: "Siguiente paso confirmado",
  },
  propuesta_enviada: {
    label: "Propuesta enviada",
    badgeClass: "bg-orange-500/20 text-orange-200 border border-orange-400/70",
    markerColor: "#f97316",
    legend: "Oferta enviada",
  },
  negociacion: {
    label: "Negociación",
    badgeClass: "bg-orange-700/20 text-orange-200 border border-orange-500/70",
    markerColor: "#c2410c",
    legend: "Cierre en progreso",
  },
  ganado: {
    label: "Ganado",
    badgeClass: "bg-emerald-500/20 text-emerald-200 border border-emerald-400/70",
    markerColor: "#10b981",
    legend: "Cliente conseguido",
  },
  perdido: {
    label: "Perdido",
    badgeClass: "bg-rose-900/30 text-rose-200 border border-rose-700/70",
    markerColor: "#9f1239",
    legend: "No viable",
    isNonViable: true,
  },
  bloqueado: {
    label: "Bloqueado",
    badgeClass:
      "bg-zinc-900 text-zinc-100 border border-zinc-500 shadow-[0_0_0_1px_rgba(255,255,255,0.12)]",
    markerColor: "#111827",
    legend: "No contactar",
    isNonViable: true,
    hasLockIcon: true,
  },
};

export const STATUS_RANK: Record<ProspectStatus, number> = {
  sin_contactar: 0,
  intento_contacto: 1,
  contactado: 2,
  reunion_agendada: 3,
  propuesta_enviada: 4,
  negociacion: 5,
  ganado: 6,
  perdido: 7,
  bloqueado: 8,
};

export const MAP_DEFAULT_ZOOM = 13;
export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 18;

export const CSV_MAX_ROWS = 150;

export const OVERPASS_FETCH_DEBOUNCE_MS = 900;
export const OVERPASS_CACHE_TTL_MS = 5 * 60 * 1000;

export const NOMINATIM_MIN_INTERVAL_MS = 1100;

export const APP_NAME = "ProspectMap";
