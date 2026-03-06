"use client";

import { AccountCommercialProfileForm } from "@/components/commercial/account-commercial-profile-form";
import { cn } from "@/lib/utils";

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
    <div className="space-y-4 px-4 py-4 lg:px-0">
      <section className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94))] p-6 shadow-[0_28px_80px_rgba(2,6,23,0.38)]">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Onboarding</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
          Configura ProspectMap como sistema operativo comercial.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          En dos pasos queda ajustado: primero contexto de empresa y territorio; luego perfil comercial para afinar
          scoring, mensajes, recomendaciones e informe por negocio.
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {STEPS.map((step, index) => {
          const active = (!profileComplete && index === 0) || (profileComplete && index === 1);
          const done = profileComplete && index === 0;

          return (
            <article
              key={step.key}
              className={cn(
                "rounded-2xl border p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]",
                active
                  ? "border-cyan-500/50 bg-cyan-500/10"
                  : done
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-900/70",
              )}
            >
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Paso {index + 1}</p>
              <h2 className="mt-2 text-base font-semibold text-slate-100">{step.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{step.body}</p>
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
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">Siguiente</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-100">Despues configuraras el playbook comercial</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Cuando guardes empresa y ciudad, esta misma pantalla pasara al perfil comercial guiado con ICP, oferta,
              ticket, objeciones y conocimiento base por PDF o texto.
            </p>
          </section>
        </div>
      ) : (
        <AccountCommercialProfileForm mode="onboarding" userId={userId} />
      )}
    </div>
  );
}
