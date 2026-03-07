"use client";

import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PmTone = "neutral" | "cyan" | "amber" | "emerald" | "rose" | "violet";

const badgeToneClass: Record<PmTone, string> = {
  neutral: "border-[rgba(247,236,220,0.08)] bg-[rgba(28,33,41,0.74)] text-[var(--pm-text-secondary)]",
  cyan: "border-[rgba(239,139,53,0.28)] bg-[rgba(239,139,53,0.11)] text-[var(--pm-text)]",
  amber: "border-[rgba(221,174,85,0.3)] bg-[rgba(221,174,85,0.11)] text-[rgba(255,243,214,0.98)]",
  emerald: "border-[rgba(78,192,134,0.28)] bg-[rgba(78,192,134,0.11)] text-[rgba(223,255,238,0.98)]",
  rose: "border-[rgba(215,111,123,0.3)] bg-[rgba(215,111,123,0.1)] text-[rgba(255,230,234,0.98)]",
  violet: "border-[rgba(155,140,242,0.28)] bg-[rgba(155,140,242,0.12)] text-[rgba(239,236,255,0.98)]",
};

const metricToneClass: Record<PmTone, string> = {
  neutral: "bg-[linear-gradient(180deg,rgba(30,35,44,0.8),rgba(19,22,28,0.82))]",
  cyan: "bg-[linear-gradient(180deg,rgba(239,139,53,0.14),rgba(23,28,36,0.86))]",
  amber: "bg-[linear-gradient(180deg,rgba(221,174,85,0.14),rgba(23,28,36,0.86))]",
  emerald: "bg-[linear-gradient(180deg,rgba(78,192,134,0.14),rgba(23,28,36,0.86))]",
  rose: "bg-[linear-gradient(180deg,rgba(215,111,123,0.14),rgba(23,28,36,0.86))]",
  violet: "bg-[linear-gradient(180deg,rgba(155,140,242,0.14),rgba(23,28,36,0.86))]",
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
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl">
          {eyebrow ? <p className="pm-kicker">{eyebrow}</p> : null}
          <h1 className="pm-title mt-3 text-[1.85rem] leading-tight sm:text-[2.4rem]">{title}</h1>
          {description ? <p className="pm-muted mt-3 max-w-3xl text-sm leading-6 sm:text-[0.96rem]">{description}</p> : null}
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
        {actions ? <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[320px] xl:items-end">{actions}</div> : null}
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="pm-caption uppercase tracking-[0.18em]">{label}</p>
          <p className="pm-title mt-3 text-[1.8rem] leading-none sm:text-[2rem]">{value}</p>
          {helper ? <p className="pm-muted mt-2 text-sm leading-6">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-[1.1rem] border border-[rgba(247,236,220,0.08)] bg-[rgba(255,255,255,0.03)] p-2.5 text-[var(--pm-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
        <h2 className="pm-title mt-2 text-[1.15rem]">{title}</h2>
        {description ? <p className="pm-muted mt-2 max-w-3xl text-sm leading-6">{description}</p> : null}
      </div>
      {action ? <div className="sm:shrink-0 sm:self-start">{action}</div> : null}
    </div>
  );
}
