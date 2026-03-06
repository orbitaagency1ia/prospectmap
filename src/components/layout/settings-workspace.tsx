"use client";

import { AccountProfileForm } from "@/components/layout/account-profile-form";

import { AccountCommercialProfileForm } from "../commercial/account-commercial-profile-form";
import { CommercialSettingsPanel } from "../commercial/commercial-settings-panel";
import { useCommercialConfig } from "../commercial/use-commercial-config";

type Props = {
  userId: string;
  email: string;
  initialCompany: string;
  initialCity: string;
};

export function SettingsWorkspace({ userId, email, initialCompany, initialCity }: Props) {
  const {
    settings,
    ready,
    saveState,
    tableAvailable,
    setCommercialPreferences,
    setScoringConfig,
    setVertical,
    resetScoringToVertical,
  } = useCommercialConfig(userId);

  return (
    <div className="grid gap-4 px-4 py-4 2xl:grid-cols-[0.9fr_1.1fr] lg:px-0">
      <div>
        <AccountProfileForm
          mode="settings"
          userId={userId}
          email={email}
          initialCompany={initialCompany}
          initialCity={initialCity}
        />
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Configuracion comercial</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-100">Motor de prospeccion de Orbita</h1>
          <p className="mt-2 text-sm text-slate-400">
            Aqui defines la vertical principal, el criterio de scoring y las preferencias que usa la cuenta en
            territorio, centro de control y prioridades.
          </p>
        </section>

        {ready ? (
          <>
            <CommercialSettingsPanel
              settings={settings}
              saveState={saveState}
              tableAvailable={tableAvailable}
              onVerticalChange={setVertical}
              onScoringChange={setScoringConfig}
              onPreferencesChange={setCommercialPreferences}
              onReset={resetScoringToVertical}
            />
            <AccountCommercialProfileForm mode="settings" userId={userId} />
          </>
        ) : (
          <section className="rounded-xl border border-slate-800 bg-slate-900/65 p-5 text-sm text-slate-400">
            Cargando configuracion comercial...
          </section>
        )}
      </div>
    </div>
  );
}
