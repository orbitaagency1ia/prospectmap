import type { ConquestSnapshot, OpportunityAlert, ProspectRecord } from "./types";

function uniqById(alerts: OpportunityAlert[]) {
  const seen = new Set<string>();
  return alerts.filter((alert) => {
    if (seen.has(alert.id)) {
      return false;
    }

    seen.add(alert.id);
    return true;
  });
}

export function buildOpportunityAlerts(records: ProspectRecord[], conquest: ConquestSnapshot): OpportunityAlert[] {
  const sorted = [...records].sort((a, b) => {
    if (b.insight.score !== a.insight.score) {
      return b.insight.score - a.insight.score;
    }

    const aDate = a.business.lastInteractionAt ?? a.business.business?.updated_at ?? "";
    const bDate = b.business.lastInteractionAt ?? b.business.business?.updated_at ?? "";
    return aDate < bDate ? 1 : -1;
  });

  const followUpAlerts = sorted
    .filter((record) => record.insight.followUpDue)
    .slice(0, 2)
    .map<OpportunityAlert>((record) => ({
      id: `follow-up-${record.business.key}`,
      kind: "follow_up_due",
      title: `${record.business.name} pide seguimiento hoy`,
      summary: `${record.insight.nextAction.action}. ${record.insight.service.shortLabel} con ${record.insight.tierLabel.toLowerCase()}.`,
      reason: "El seguimiento ya está vencido y la oportunidad sigue viva.",
      actionLabel: "Retomar ahora",
      urgency: "alta",
      businessKey: record.business.key,
    }));

  const coolingAlerts = sorted
    .filter((record) => record.insight.coolingDown && !record.insight.followUpDue)
    .slice(0, 2)
    .map<OpportunityAlert>((record) => ({
      id: `cooling-${record.business.key}`,
      kind: "cooling_down",
      title: `${record.business.name} se está enfriando`,
      summary: `${record.insight.attentionLabel}. Lleva ${record.insight.daysSinceTouch ?? 0} días sin movimiento.`,
      reason: "Sigue teniendo encaje, pero está perdiendo timing.",
      actionLabel: "Abrir informe",
      urgency: "alta",
      businessKey: record.business.key,
    }));

  const untouchedAlerts = sorted
    .filter((record) => record.business.status === "sin_contactar" && record.insight.score >= 78)
    .slice(0, 2)
    .map<OpportunityAlert>((record) => ({
      id: `untouched-${record.business.key}`,
      kind: "high_opportunity_untouched",
      title: `${record.business.name} sigue sin tocar`,
      summary: `Prioridad ${record.insight.score} y entrada recomendada por ${record.insight.service.shortLabel.toLowerCase()}.`,
      reason: "Es una oportunidad clara y todavía no hay primer movimiento.",
      actionLabel: "Preparar ataque",
      urgency: "media",
      businessKey: record.business.key,
    }));

  const highValuePending = sorted
    .filter(
      (record) =>
        record.insight.estimatedValue >= 2500 &&
        !record.insight.followUpAt &&
        record.business.status !== "ganado" &&
        record.business.status !== "perdido" &&
        record.business.status !== "bloqueado",
    )
    .slice(0, 1)
    .map<OpportunityAlert>((record) => ({
      id: `value-${record.business.key}`,
      kind: "high_value_pending",
      title: `${record.business.name} tiene valor alto sin siguiente paso`,
      summary: `${record.insight.estimatedValueLabel} y sin follow-up programado.`,
      reason: "Hay potencial económico claro, pero el siguiente movimiento no está asegurado.",
      actionLabel: "Programar seguimiento",
      urgency: "media",
      businessKey: record.business.key,
    }));

  const recentPriority = sorted
    .filter((record) => {
      const createdAt = record.business.business?.created_at;
      if (!createdAt || record.insight.score < 72) {
        return false;
      }

      const createdMs = new Date(createdAt).getTime();
      const ageDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
      return ageDays <= 5;
    })
    .slice(0, 1)
    .map<OpportunityAlert>((record) => ({
      id: `recent-${record.business.key}`,
      kind: "recent_priority",
      title: `${record.business.name} acaba de entrar y merece foco`,
      summary: `${record.insight.tierLabel} con ${record.insight.service.shortLabel.toLowerCase()} como mejor encaje.`,
      reason: "Los leads buenos recién guardados se aprovechan mejor en las primeras 48-72 horas.",
      actionLabel: "Revisar ahora",
      urgency: "media",
      businessKey: record.business.key,
    }));

  const zoneAlert = conquest.underusedZones[0]
    ? ([
        {
          id: `zone-${conquest.underusedZones[0].key}`,
          kind: "zone_underused",
          title: `${conquest.underusedZones[0].label} está desaprovechada`,
          summary: `${conquest.underusedZones[0].untouchedCount} leads sin tocar y ${conquest.underusedZones[0].highPotentialCount} con señal fuerte.`,
          reason: "Hay concentración de negocio útil sin cobertura comercial suficiente.",
          actionLabel: "Ver mejor cuenta",
          urgency: conquest.underusedZones[0].highPotentialCount >= 2 ? "alta" : "media",
          businessKey: conquest.underusedZones[0].topBusinessKey,
          zoneKey: conquest.underusedZones[0].key,
          zoneLabel: conquest.underusedZones[0].label,
        } satisfies OpportunityAlert,
      ] as OpportunityAlert[])
    : [];

  return uniqById([
    ...followUpAlerts,
    ...coolingAlerts,
    ...untouchedAlerts,
    ...highValuePending,
    ...recentPriority,
    ...zoneAlert,
  ]).slice(0, 8);
}
