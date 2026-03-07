"use client";

import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PmTone = "neutral" | "cyan" | "amber" | "emerald" | "rose" | "violet";

const badgeToneClass: Record<PmTone, string> = {
  neutral: "border-[rgba(30,51,80,0.92)] bg-[rgba(7,17,31,0.68)] text-[var(--pm-text-secondary)]",
  cyan: "border-[rgba(58,190,249,0.45)] bg-[rgba(58,190,249,0.12)] text-[var(--pm-text)]",
  amber: "border-[rgba(245,185,66,0.4)] bg-[rgba(245,185,66,0.12)] text-[rgba(255,239,204,0.98)]",
  emerald: "border-[rgba(46,212,122,0.4)] bg-[rgba(46,212,122,0.12)] text-[rgba(221,255,235,0.98)]",
  rose: "border-[rgba(227,93,106,0.4)] bg-[rgba(227,93,106,0.12)] text-[rgba(255,230,234,0.98)]",
  violet: "border-[rgba(138,124,255,0.4)] bg-[rgba(138,124,255,0.12)] text-[rgba(235,233,255,0.98)]",
};

const metricToneClass: Record<PmTone, string> = {
  neutral: "border-[rgba(30,51,80,0.92)] bg-[rgba(18,32,51,0.78)]",
  cyan: "border-[rgba(58,190,249,0.34)] bg-[rgba(58,190,249,0.1)]",
  amber: "border-[rgba(245,185,66,0.3)] bg-[rgba(245,185,66,0.1)]",
  emerald: "border-[rgba(46,212,122,0.3)] bg-[rgba(46,212,122,0.1)]",
  rose: "border-[rgba(227,93,106,0.3)] bg-[rgba(227,93,106,0.1)]",
  violet: "border-[rgba(138,124,255,0.3)] bg-[rgba(138,124,255,0.1)]",
};

export function PmPanel({
  children,
  className,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}) {
  return <section className={cn("pm-panel", elevated && "pm-panel-elevated", className)}>{children}</section>;
}

export function PmHero({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <PmPanel elevated className={className}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? <p className="pm-kicker">{eyebrow}</p> : null}
          <h1 className="pm-title mt-3 text-2xl sm:text-3xl">{title}</h1>
          {description ? <p className="pm-muted mt-3 text-sm leading-6">{description}</p> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
        {actions ? <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">{actions}</div> : null}
      </div>
    </PmPanel>
  );
}

export function PmMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: PmTone;
  className?: string;
}) {
  return (
    <article className={cn("pm-card", metricToneClass[tone], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="pm-caption uppercase tracking-[0.16em]">{label}</p>
          <p className="pm-title mt-3 text-2xl sm:text-[1.9rem]">{value}</p>
          {helper ? <p className="pm-muted mt-2 text-sm">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-2xl border border-[rgba(58,190,249,0.24)] bg-[rgba(58,190,249,0.08)] p-2.5 text-[var(--pm-primary)]">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function PmBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: PmTone;
  className?: string;
}) {
  return <span className={cn("pm-badge", badgeToneClass[tone], className)}>{children}</span>;
}

export function PmNotice({
  children,
  tone = "amber",
  className,
}: {
  children: ReactNode;
  tone?: PmTone;
  className?: string;
}) {
  return <div className={cn("pm-card text-sm", badgeToneClass[tone], className)}>{children}</div>;
}

export function PmEmpty({
  title,
  body,
  className,
}: {
  title?: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={cn("pm-empty", className)}>
      {title ? <p className="pm-title text-sm">{title}</p> : null}
      <p className={cn("text-sm leading-6", title ? "pm-muted mt-2" : "pm-muted")}>{body}</p>
    </div>
  );
}

export function PmSectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div>
        {eyebrow ? <p className="pm-kicker">{eyebrow}</p> : null}
        <h2 className="pm-title mt-2 text-lg">{title}</h2>
        {description ? <p className="pm-muted mt-2 text-sm leading-6">{description}</p> : null}
      </div>
      {action ? <div className="sm:shrink-0">{action}</div> : null}
    </div>
  );
}
