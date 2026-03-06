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

type Props = {
  data: DashboardData;
};

export function DashboardClient({ data }: Props) {
  return (
    <div className="space-y-4 px-4 py-4 lg:px-0">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="status" tick={{ fill: "#cbd5e1", fontSize: 11 }} interval={0} angle={-20} dy={12} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                    color: "#e2e8f0",
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
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                    color: "#e2e8f0",
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
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                    color: "#e2e8f0",
                  }}
                />
                <Line type="monotone" dataKey="updates" stroke="#22d3ee" strokeWidth={2.5} dot={{ fill: "#22d3ee" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Distribución por sector">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.sectorDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
                <YAxis type="category" dataKey="sector" tick={{ fill: "#cbd5e1", fontSize: 11 }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                    color: "#e2e8f0",
                  }}
                />
                <Bar dataKey="value" fill="#38bdf8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <Panel title="Actividad reciente">
        <div className="space-y-2">
          {data.recentActivity.length === 0 ? (
            <p className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-400">
              Aún no hay actividad registrada.
            </p>
          ) : null}
          {data.recentActivity.map((activity) => (
            <article key={activity.id} className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-500">{formatDateTime(activity.createdAt)}</p>
              <p className="mt-1 text-sm text-slate-100">
                <span className="font-semibold">{activity.businessName}</span>
                {" · "}
                <span className="text-slate-300">{activity.type === "note" ? "Nota" : "Actualización"}</span>
              </p>
              <p className="mt-1 text-sm text-slate-300">{activity.text}</p>
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
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-cyan-100">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">{title}</h2>
      {children}
    </section>
  );
}
