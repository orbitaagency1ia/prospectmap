"use client";

import { AccountProfileForm } from "@/components/layout/account-profile-form";

import { AccountCommercialProfileForm } from "../commercial/account-commercial-profile-form";
import { CommercialSettingsPanel } from "../commercial/commercial-settings-panel";
import { useCommercialConfig } from "../commercial/use-commercial-config";
import { PmBadge, PmHero, PmPanel } from "../ui/pm";

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
      <PmHero
        eyebrow="Configuración"
        title="Cuenta, territorio y criterio."
        description="Ajusta la base de la cuenta y el motor comercial sin romper el flujo operativo."
        actions={
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <PmBadge>{settings.vertical ? "Vertical lista" : "Vertical pendiente"}</PmBadge>
              <PmBadge tone={saveState === "error" ? "rose" : saveState === "local_only" ? "amber" : "neutral"}>
                {saveState === "saving" ? "Guardando" : saveState === "saved" ? "Actualizado" : saveState === "local_only" ? "Local" : saveState === "error" ? "Revisar" : "Estable"}
              </PmBadge>
            </div>
            <p className="text-sm leading-6 text-[var(--pm-text-secondary)]">
              Cuenta base, playbook y scoring viven aquí.
            </p>
          </div>
        }
      />

      <div className="grid gap-5 2xl:grid-cols-[0.84fr_1.16fr]">
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
          <PmPanel className="p-5 sm:p-6">
            <p className="pm-kicker">Motor comercial</p>
            <h1 className="pm-title mt-2 text-[1.7rem]">Cómo piensa la cuenta</h1>
            <p className="pm-muted mt-3 max-w-2xl text-sm leading-6">
              Vertical, scoring y preferencias que alimentan territorio, prioridades y ataque.
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
