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
    badgeClass: "border border-[var(--pm-border-strong)] bg-[rgba(255,255,255,0.04)] text-[var(--pm-text)]",
    markerColor: "#9ca3af",
    legend: "No trabajado",
  },
  intento_contacto: {
    label: "Intento de contacto",
    badgeClass: "border border-[rgba(221,174,85,0.36)] bg-[rgba(221,174,85,0.12)] text-[rgba(255,243,214,0.98)]",
    markerColor: "#f59e0b",
    legend: "Intentando contactar",
  },
  contactado: {
    label: "Contactado",
    badgeClass: "border border-[rgba(155,140,242,0.34)] bg-[rgba(155,140,242,0.12)] text-[rgba(239,236,255,0.98)]",
    markerColor: "#8f7af5",
    legend: "Primer contacto logrado",
  },
  reunion_agendada: {
    label: "Reunión agendada",
    badgeClass: "border border-[rgba(155,140,242,0.42)] bg-[rgba(155,140,242,0.18)] text-[rgba(245,241,255,0.98)]",
    markerColor: "#7d68ea",
    legend: "Siguiente paso confirmado",
  },
  propuesta_enviada: {
    label: "Propuesta enviada",
    badgeClass: "border border-[rgba(239,139,53,0.36)] bg-[rgba(239,139,53,0.13)] text-[rgba(255,226,194,0.98)]",
    markerColor: "#ef8b35",
    legend: "Oferta enviada",
  },
  negociacion: {
    label: "Negociación",
    badgeClass: "border border-[rgba(214,120,49,0.42)] bg-[rgba(214,120,49,0.16)] text-[rgba(255,223,189,0.98)]",
    markerColor: "#d67831",
    legend: "Cierre en progreso",
  },
  ganado: {
    label: "Ganado",
    badgeClass: "border border-[rgba(78,192,134,0.34)] bg-[rgba(78,192,134,0.13)] text-[rgba(223,255,238,0.98)]",
    markerColor: "#4ec086",
    legend: "Cliente conseguido",
  },
  perdido: {
    label: "Perdido",
    badgeClass: "border border-[rgba(215,111,123,0.34)] bg-[rgba(215,111,123,0.14)] text-[rgba(255,230,234,0.98)]",
    markerColor: "#d76f7b",
    legend: "No viable",
    isNonViable: true,
  },
  bloqueado: {
    label: "Bloqueado",
    badgeClass:
      "border border-[rgba(247,236,220,0.18)] bg-[rgba(9,11,15,0.94)] text-[var(--pm-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
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
