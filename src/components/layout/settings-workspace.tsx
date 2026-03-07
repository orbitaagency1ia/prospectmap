"use client";

import { AccountProfileForm } from "@/components/layout/account-profile-form";

import { AccountCommercialProfileForm } from "../commercial/account-commercial-profile-form";
import { CommercialSettingsPanel } from "../commercial/commercial-settings-panel";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { PmPanel, PmSectionHeader } from "../ui/pm";

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
    <div className="pm-page">
      <PmPanel elevated>
        <PmSectionHeader
          eyebrow="Configuración"
          title="Cuenta, territorio y criterio comercial"
          description="Ajusta la información base de la cuenta y el motor de prospección sin salir del flujo operativo."
        />
      </PmPanel>

      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
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
        <PmPanel className="p-5">
          <p className="pm-kicker">Configuración comercial</p>
          <h1 className="pm-title mt-2 text-2xl">Motor de prospección de Órbita</h1>
          <p className="pm-muted mt-2 text-sm">
            Aquí defines la vertical principal, el criterio de scoring y las preferencias que usa la cuenta en
            territorio, centro de control y prioridades.
          </p>
        </PmPanel>

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
          <section className="pm-panel text-sm text-[var(--pm-text-secondary)]">Cargando configuración comercial...</section>
        )}
      </div>
      </div>
    </div>
  );
}
