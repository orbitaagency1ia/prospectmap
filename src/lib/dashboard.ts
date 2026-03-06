import { PROSPECT_STATUS_ORDER, STATUS_META, STATUS_RANK, type ProspectStatus } from "@/lib/constants";
import type { BusinessRow } from "@/lib/types";

export type DashboardActivity = {
  id: string;
  type: "note" | "status_update";
  businessName: string;
  text: string;
  createdAt: string;
};

export type DashboardData = {
  cards: {
    totalProspected: number;
    contactRate: number;
    responseRate: number;
    successRate: number;
  };
  funnel: { status: string; value: number; key: ProspectStatus }[];
  statusDistribution: { name: string; value: number; key: ProspectStatus }[];
  timeline: { date: string; updates: number }[];
  sectorDistribution: { sector: string; value: number }[];
  recentActivity: DashboardActivity[];
  formulaNotes: {
    contactRate: string;
    responseRate: string;
    successRate: string;
  };
};

function getStatus(value: string): ProspectStatus {
  if (PROSPECT_STATUS_ORDER.includes(value as ProspectStatus)) {
    return value as ProspectStatus;
  }

  return "sin_contactar";
}

function formatDay(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function buildDashboardData(input: {
  businesses: BusinessRow[];
  notes: {
    id: string;
    business_id: string;
    note_text: string;
    created_at: string;
    business_name?: string;
  }[];
}): DashboardData {
  const { businesses, notes } = input;

  const statuses = businesses.map((business) => getStatus(business.prospect_status));

  const totalProspected = statuses.filter((status) => status !== "sin_contactar").length;

  const contactDenominator = statuses.filter((status) => STATUS_RANK[status] >= STATUS_RANK.intento_contacto).length;
  const contactNumerator = statuses.filter((status) => STATUS_RANK[status] >= STATUS_RANK.contactado).length;
  const contactRate = contactDenominator > 0 ? contactNumerator / contactDenominator : 0;

  const responseDenominator = statuses.filter((status) => STATUS_RANK[status] >= STATUS_RANK.contactado).length;
  const responseNumerator = statuses.filter((status) => STATUS_RANK[status] >= STATUS_RANK.reunion_agendada).length;
  const responseRate = responseDenominator > 0 ? responseNumerator / responseDenominator : 0;

  const wonCount = statuses.filter((status) => status === "ganado").length;
  const successRate = totalProspected > 0 ? wonCount / totalProspected : 0;

  const byStatus = PROSPECT_STATUS_ORDER.map((status) => {
    const value = statuses.filter((entry) => entry === status).length;
    return {
      key: status,
      status: STATUS_META[status].label,
      name: STATUS_META[status].label,
      value,
    };
  });

  const timelineMap = new Map<string, number>();
  const today = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  businesses.forEach((business) => {
    const date = new Date(business.updated_at);
    if (Number.isNaN(date.getTime())) return;

    if (today - date.getTime() > THIRTY_DAYS_MS) return;

    const key = date.toISOString().slice(0, 10);
    timelineMap.set(key, (timelineMap.get(key) ?? 0) + 1);
  });

  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, updates]) => ({
      date: formatDay(date),
      updates,
    }));

  const sectorMap = new Map<string, number>();
  businesses.forEach((business) => {
    const sector = business.category?.trim() || "Sin categoría";
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + 1);
  });

  const sectorDistribution = Array.from(sectorMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([sector, value]) => ({
      sector,
      value,
    }));

  const activity: DashboardActivity[] = [];

  notes.slice(0, 20).forEach((note) => {
    activity.push({
      id: `note-${note.id}`,
      type: "note",
      businessName: note.business_name ?? "Negocio",
      text: note.note_text,
      createdAt: note.created_at,
    });
  });

  businesses
    .slice(0, 15)
    .forEach((business) => {
      activity.push({
        id: `update-${business.id}`,
        type: "status_update",
        businessName: business.name,
        text: `Estado actual: ${STATUS_META[getStatus(business.prospect_status)].label}`,
        createdAt: business.updated_at,
      });
    });

  activity.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));

  return {
    cards: {
      totalProspected,
      contactRate,
      responseRate,
      successRate,
    },
    funnel: byStatus.map(({ key, status, value }) => ({ key, status, value })),
    statusDistribution: byStatus.map(({ key, name, value }) => ({ key, name, value })),
    timeline,
    sectorDistribution,
    recentActivity: activity.slice(0, 12),
    formulaNotes: {
      contactRate:
        "contactados o superior / (intento_contacto + estados posteriores). Mide cuántos intentos llegan a contacto real.",
      responseRate:
        "reunion_agendada o superior / contactado o superior. Mide progresión tras primer contacto.",
      successRate: "ganado / total prospectados (estado distinto de sin_contactar).",
    },
  };
}
