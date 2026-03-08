"use client";

import type { ComponentType, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PmTone = "neutral" | "cyan" | "amber" | "emerald" | "rose" | "violet";

const badgeToneClass: Record<PmTone, string> = {
  neutral: "border-[rgba(244,236,224,0.06)] bg-[rgba(255,255,255,0.03)] text-[var(--pm-text-secondary)]",
  cyan: "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] text-[var(--pm-text)]",
  amber: "border-[rgba(161,148,128,0.18)] bg-[rgba(161,148,128,0.09)] text-[rgba(244,241,234,0.96)]",
  emerald: "border-[rgba(141,157,146,0.18)] bg-[rgba(141,157,146,0.1)] text-[rgba(240,244,241,0.96)]",
  rose: "border-[rgba(154,125,130,0.18)] bg-[rgba(154,125,130,0.1)] text-[rgba(245,238,239,0.96)]",
  violet: "border-[rgba(168,171,177,0.16)] bg-[rgba(168,171,177,0.08)] text-[rgba(240,240,240,0.96)]",
};

const metricToneClass: Record<PmTone, string> = {
  neutral: "before:bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_58%)]",
  cyan: "before:bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_60%)]",
  amber: "before:bg-[linear-gradient(135deg,rgba(161,148,128,0.14),transparent_60%)]",
  emerald: "before:bg-[linear-gradient(135deg,rgba(141,157,146,0.12),transparent_60%)]",
  rose: "before:bg-[linear-gradient(135deg,rgba(154,125,130,0.12),transparent_60%)]",
  violet: "before:bg-[linear-gradient(135deg,rgba(168,171,177,0.1),transparent_60%)]",
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
    <PmPanel elevated className={cn("pm-scene-hero pm-texture-soft overflow-hidden", className)}>
      <div className="relative z-[1] grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] xl:items-end">
        <div className="min-w-0 max-w-4xl pl-3 sm:pl-4">
          {eyebrow ? <p className="pm-kicker">{eyebrow}</p> : null}
          <h1 className="pm-title mt-4 text-[1.95rem] leading-[0.98] sm:text-[2.6rem] xl:text-[3.15rem]">{title}</h1>
          {description ? <p className="pm-muted mt-4 max-w-3xl text-[0.94rem] leading-7 sm:text-[0.98rem]">{description}</p> : null}
          {children ? <div className="mt-6">{children}</div> : null}
        </div>
        {actions ? (
          <div className="relative z-[1] xl:justify-self-end xl:min-w-[320px] xl:max-w-[420px] xl:self-stretch">
            <div className="pm-focus-pane px-4 py-4 sm:px-5 sm:py-5">{actions}</div>
          </div>
        ) : null}
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
    <article className={cn("pm-card relative overflow-hidden before:absolute before:inset-0 before:opacity-100", metricToneClass[tone], className)}>
      <div className="relative z-[1] flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="pm-caption text-[0.68rem] uppercase tracking-[0.22em]">{label}</p>
          <p className="pm-title mt-4 text-[2rem] leading-none sm:text-[2.2rem]">{value}</p>
          {helper ? <p className="pm-muted mt-3 text-sm leading-6">{helper}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.035)] text-[var(--pm-text)] shadow-[var(--pm-shadow-line)]">
            <Icon className="h-[18px] w-[18px]" />
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
  return (
    <div className={cn("pm-card pm-notice px-4 py-3 text-sm leading-6", badgeToneClass[tone], className)}>
      {children}
    </div>
  );
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
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? <p className="pm-kicker">{eyebrow}</p> : null}
        <h2 className="pm-title mt-3 text-[1.2rem] leading-tight sm:text-[1.45rem]">{title}</h2>
        {description ? <p className="pm-muted mt-3 text-sm leading-6">{description}</p> : null}
      </div>
      {action ? <div className="md:shrink-0">{action}</div> : null}
    </div>
  );
}
