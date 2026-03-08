"use client";

import { AccountCommercialProfileForm } from "@/components/commercial/account-commercial-profile-form";
import { cn } from "@/lib/utils";

import { PmBadge, PmHero, PmPanel } from "../ui/pm";

import { AccountProfileForm } from "./account-profile-form";

type Props = {
  userId: string;
  email: string;
  initialCompany: string;
  initialCity: string;
  profileComplete: boolean;
};

const STEPS = [
  {
    key: "company",
    title: "Empresa y territorio",
    body: "Define empresa y ciudad base para centrar mapa y mercado inicial.",
  },
  {
    key: "profile",
    title: "Perfil comercial",
    body: "Explica ICP, oferta, ticket, objeciones y estilo comercial.",
  },
  {
    key: "launch",
    title: "Prospección lista",
    body: "Con eso, ProspectMap ya puede priorizar, recomendar y preparar el ataque.",
  },
];

export function OnboardingWorkspace({
  userId,
  email,
  initialCompany,
  initialCity,
  profileComplete,
}: Props) {
  return (
    <div className="pm-page">
      <PmHero
        eyebrow="Onboarding"
        title="Configura ProspectMap una sola vez."
        description="Empresa, territorio y playbook comercial. Después, el producto ya trabaja con criterio propio."
        actions={
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <PmBadge>{profileComplete ? "Paso 1 completo" : "Paso 1 en curso"}</PmBadge>
              <PmBadge tone={profileComplete ? "emerald" : "neutral"}>{profileComplete ? "Perfil comercial listo" : "Perfil comercial pendiente"}</PmBadge>
            </div>
            <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">
              Dos pasos. Sin fricción. Sin salir del flujo.
            </p>
          </div>
        }
      />

      <section className="grid gap-3 lg:grid-cols-3">
        {STEPS.map((step, index) => {
          const active = (!profileComplete && index === 0) || (profileComplete && index === 1);
          const done = profileComplete && index === 0;

          return (
            <article
              key={step.key}
              className={cn(
                "pm-card",
                active
                  ? "border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(30,35,44,0.84))]"
                  : done
                    ? "border-[rgba(141,157,146,0.18)] bg-[linear-gradient(180deg,rgba(141,157,146,0.08),rgba(30,35,44,0.84))]"
                    : "",
              )}
            >
              <p className="pm-caption uppercase tracking-[0.14em]">Paso {index + 1}</p>
              <h2 className="pm-title mt-2 text-base">{step.title}</h2>
              <p className="pm-muted mt-2 text-sm">{step.body}</p>
            </article>
          );
        })}
      </section>

      {!profileComplete ? (
        <div className="grid gap-4 2xl:grid-cols-[1fr_0.8fr]">
          <AccountProfileForm
            mode="onboarding"
            userId={userId}
            email={email}
            initialCompany={initialCompany}
            initialCity={initialCity}
            redirectPath={null}
          />
          <PmPanel className="p-6">
            <p className="pm-kicker">Siguiente</p>
            <h2 className="pm-title mt-2 text-xl">Después ajustarás el playbook comercial</h2>
            <p className="pm-muted mt-3 text-sm leading-6">
              Cuando guardes empresa y ciudad, esta misma pantalla pasará al perfil comercial guiado con ICP, oferta,
              ticket, objeciones y conocimiento base.
            </p>
          </PmPanel>
        </div>
      ) : (
        <AccountCommercialProfileForm mode="onboarding" userId={userId} />
      )}
    </div>
  );
}
