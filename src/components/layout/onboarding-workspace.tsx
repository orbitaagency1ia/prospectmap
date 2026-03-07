"use client";

import { AccountCommercialProfileForm } from "@/components/commercial/account-commercial-profile-form";
import { cn } from "@/lib/utils";

import { PmPanel } from "../ui/pm";

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
    title: "Prospeccion lista",
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
      <PmPanel elevated className="p-6">
        <p className="pm-kicker">Onboarding</p>
        <h1 className="pm-title mt-3 text-3xl">Configura ProspectMap como sistema operativo comercial.</h1>
        <p className="pm-muted mt-3 max-w-3xl text-sm leading-6">
          En dos pasos queda ajustado: primero contexto de empresa y territorio; luego perfil comercial para afinar
          scoring, mensajes, recomendaciones e informe por negocio.
        </p>
      </PmPanel>

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
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : done
                    ? "border-emerald-500/40 bg-emerald-500/10"
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
            <h2 className="pm-title mt-2 text-xl">Después configurarás el playbook comercial</h2>
            <p className="pm-muted mt-3 text-sm leading-6">
              Cuando guardes empresa y ciudad, esta misma pantalla pasara al perfil comercial guiado con ICP, oferta,
              ticket, objeciones y conocimiento base por PDF o texto.
            </p>
          </PmPanel>
        </div>
      ) : (
        <AccountCommercialProfileForm mode="onboarding" userId={userId} />
      )}
    </div>
  );
}
