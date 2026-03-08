"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { STATUS_META } from "@/lib/constants";
import type { DashboardData } from "@/lib/dashboard";
import { formatDateTime, formatPercent } from "@/lib/utils";

import { PmHero, PmMetric, PmPanel } from "../ui/pm";

type Props = {
  data: DashboardData;
};

export function DashboardClient({ data }: Props) {
  return (
    <div className="pm-page">
      <PmHero
        eyebrow="Analítica"
        title="Lectura del pipeline."
        description="Actividad, distribución y ritmo comercial en una sola vista."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total prospectados" value={`${data.cards.totalProspected}`} helper="Estado distinto de sin contactar" />
        <MetricCard title="Tasa de contacto" value={formatPercent(data.cards.contactRate)} helper={data.formulaNotes.contactRate} />
        <MetricCard title="Tasa de respuesta" value={formatPercent(data.cards.responseRate)} helper={data.formulaNotes.responseRate} />
        <MetricCard title="Tasa de éxito" value={formatPercent(data.cards.successRate)} helper={data.formulaNotes.successRate} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Embudo por estado">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.funnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,236,220,0.08)" />
                <XAxis dataKey="status" tick={{ fill: "#8f877b", fontSize: 11 }} interval={0} angle={-20} dy={12} />
                <YAxis tick={{ fill: "#8f877b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,24,31,0.96)",
                    border: "1px solid rgba(247,236,220,0.08)",
                    borderRadius: "1rem",
                    color: "#f6f1e8",
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {data.funnel.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_META[entry.key].markerColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Distribución por estado">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.statusDistribution} dataKey="value" nameKey="name" outerRadius={100} innerRadius={52}>
                  {data.statusDistribution.map((entry) => (
                    <Cell key={entry.key} fill={STATUS_META[entry.key].markerColor} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,24,31,0.96)",
                    border: "1px solid rgba(247,236,220,0.08)",
                    borderRadius: "1rem",
                    color: "#f6f1e8",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Evolución temporal (30 días)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,236,220,0.08)" />
                <XAxis dataKey="date" tick={{ fill: "#8f877b", fontSize: 12 }} />
                <YAxis tick={{ fill: "#8f877b", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,24,31,0.96)",
                    border: "1px solid rgba(247,236,220,0.08)",
                    borderRadius: "1rem",
                    color: "#f6f1e8",
                  }}
                />
                <Line type="monotone" dataKey="updates" stroke="#ef8b35" strokeWidth={2.5} dot={{ fill: "#f6a24c" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Distribución por sector">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sectorDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,236,220,0.08)" />
                <XAxis type="number" tick={{ fill: "#8f877b", fontSize: 12 }} />
                <YAxis type="category" dataKey="sector" tick={{ fill: "#8f877b", fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20,24,31,0.96)",
                    border: "1px solid rgba(247,236,220,0.08)",
                    borderRadius: "1rem",
                    color: "#f6f1e8",
                  }}
                />
                <Bar dataKey="value" fill="#ef8b35" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <Panel title="Actividad reciente">
        <div className="space-y-2">
          {data.recentActivity.length === 0 ? (
            <p className="pm-card-soft px-3 py-2 text-sm text-[var(--pm-text-secondary)]">
              Aún no hay actividad registrada.
            </p>
          ) : null}
          {data.recentActivity.map((activity) => (
            <article key={activity.id} className="pm-card-soft px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-[var(--pm-text-tertiary)]">{formatDateTime(activity.createdAt)}</p>
              <p className="mt-1 text-sm text-[var(--pm-text)]">
                <span className="font-semibold">{activity.businessName}</span>
                {" · "}
                <span className="text-[var(--pm-text-secondary)]">
                  {activity.type === "note" ? "Nota" : activity.type === "event" ? "Evento" : "Actualización"}
                </span>
              </p>
              <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{activity.text}</p>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return <PmMetric label={title} value={value} helper={helper} />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PmPanel className="p-5">
      <h2 className="mb-4 text-[1rem] font-semibold tracking-[-0.02em] text-[var(--pm-text)]">{title}</h2>
      {children}
    </PmPanel>
  );
}
