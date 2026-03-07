"use client";

import { FormEvent, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FileText, Sparkles, Upload } from "lucide-react";

import {
  applyKnowledgeSummaryToProfile,
  buildDefaultAccountCommercialProfile,
  extractKnowledgeSummaryFromText,
  sanitizeAccountCommercialProfile,
  type AccountCommercialProfile,
  type AccountKnowledgeSummary,
} from "@/lib/prospect-intelligence";

import { PmBadge, PmHero, PmNotice, PmPanel } from "../ui/pm";

import { useAccountCommercialProfile } from "./use-account-commercial-profile";

type Props = {
  mode: "onboarding" | "settings";
  userId: string;
};

type FormValues = {
  sector: string;
  targetVerticals: string;
  targetSubsectors: string;
  targetCustomer: string;
  targetGeographies: string;
  bestFitCompanyTraits: string;
  excludedCompanyTraits: string;
  whatYouSell: string;
  mainServices: string;
  secondaryServices: string;
  averagePriceRange: string;
  minimumDesiredTicket: string;
  mainProblemSolved: string;
  valueProposition: string;
  typicalObjections: string;
  preferredChannels: string;
  focusPriorities: string;
  salesStyle: string;
  preferredCta: string;
  reviewBeforeContact: string;
  avoidTalkingPoints: string;
  recommendedAngles: string;
  knowledgeBaseText: string;
};

function joinList(values: string[]) {
  return values.join(", ");
}

function splitList(value: string) {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileToFormValues(profile: AccountCommercialProfile): FormValues {
  return {
    sector: profile.sector,
    targetVerticals: joinList(profile.targetVerticals),
    targetSubsectors: joinList(profile.targetSubsectors),
    targetCustomer: profile.idealCustomerProfile.targetCustomer,
    targetGeographies: joinList(profile.idealCustomerProfile.targetGeographies),
    bestFitCompanyTraits: joinList(profile.idealCustomerProfile.bestFitCompanyTraits),
    excludedCompanyTraits: joinList(profile.idealCustomerProfile.excludedCompanyTraits),
    whatYouSell: profile.offerProfile.whatYouSell,
    mainServices: joinList(profile.offerProfile.mainServices),
    secondaryServices: joinList(profile.offerProfile.secondaryServices),
    averagePriceRange: profile.pricingProfile.averagePriceRange,
    minimumDesiredTicket: profile.pricingProfile.minimumDesiredTicket,
    mainProblemSolved: profile.offerProfile.mainProblemSolved,
    valueProposition: profile.offerProfile.valueProposition,
    typicalObjections: joinList(profile.offerProfile.typicalObjections),
    preferredChannels: joinList(profile.prospectingPreferences.preferredChannels),
    focusPriorities: joinList(profile.prospectingPreferences.focusPriorities),
    salesStyle: profile.offerProfile.salesStyle,
    preferredCta: profile.offerProfile.preferredCta,
    reviewBeforeContact: joinList(profile.offerProfile.reviewBeforeContact),
    avoidTalkingPoints: joinList(profile.offerProfile.avoidTalkingPoints),
    recommendedAngles: joinList(profile.offerProfile.recommendedAngles),
    knowledgeBaseText: profile.knowledgeBaseText,
  };
}

function formValuesToProfile(values: FormValues, current: AccountCommercialProfile) {
  return sanitizeAccountCommercialProfile({
    ...current,
    sector: values.sector,
    targetVerticals: splitList(values.targetVerticals),
    targetSubsectors: splitList(values.targetSubsectors),
    idealCustomerProfile: {
      targetCustomer: values.targetCustomer,
      targetGeographies: splitList(values.targetGeographies),
      bestFitCompanyTraits: splitList(values.bestFitCompanyTraits),
      excludedCompanyTraits: splitList(values.excludedCompanyTraits),
    },
    offerProfile: {
      whatYouSell: values.whatYouSell,
      mainServices: splitList(values.mainServices),
      secondaryServices: splitList(values.secondaryServices),
      mainProblemSolved: values.mainProblemSolved,
      valueProposition: values.valueProposition,
      typicalObjections: splitList(values.typicalObjections),
      preferredCta: values.preferredCta,
      salesStyle: values.salesStyle,
      reviewBeforeContact: splitList(values.reviewBeforeContact),
      avoidTalkingPoints: splitList(values.avoidTalkingPoints),
      recommendedAngles: splitList(values.recommendedAngles),
    },
    pricingProfile: {
      averagePriceRange: values.averagePriceRange,
      minimumDesiredTicket: values.minimumDesiredTicket,
    },
    prospectingPreferences: {
      preferredChannels: splitList(values.preferredChannels),
      focusPriorities: splitList(values.focusPriorities),
    },
    knowledgeBaseText: values.knowledgeBaseText,
    onboardingCompleted: true,
  });
}

async function extractTextFromPdf(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const fileBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(fileBuffer),
  }).promise;

  const pages = Math.min(pdf.numPages, 20);
  const chunks: string[] = [];

  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();

    if (text) {
      chunks.push(text);
    }
  }

  return chunks.join("\n\n");
}

async function extractTextFromFile(file: File) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }

  return file.text();
}

export function AccountCommercialProfileForm({ mode, userId }: Props) {
  const router = useRouter();
  const { profile, ready, saveProfile, saveState, tableAvailable } = useAccountCommercialProfile(userId);

  const [draft, setDraft] = useState<FormValues>(() => profileToFormValues(buildDefaultAccountCommercialProfile()));
  const [summary, setSummary] = useState<AccountKnowledgeSummary>(buildDefaultAccountCommercialProfile().knowledgeSummary);
  const [file, setFile] = useState<File | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) {
      return;
    }

    setDraft(profileToFormValues(profile));
    setSummary(profile.knowledgeSummary);
  }, [profile, ready]);

  const saveLabel =
    saveState === "saving"
      ? "Guardando"
      : saveState === "saved"
        ? "Cambios guardados"
        : saveState === "local_only"
          ? "Guardado temporal"
          : saveState === "error"
            ? "Revisión pendiente"
            : "Todo al día";

  const summaryHasData = useMemo(
    () =>
      summary.detectedServices.length > 0 ||
      summary.detectedPainPoints.length > 0 ||
      summary.detectedObjections.length > 0 ||
      summary.detectedValueProps.length > 0,
    [summary],
  );

  if (!ready) {
    return (
      <section className="pm-panel text-sm text-[var(--pm-text-secondary)]">Cargando perfil comercial...</section>
    );
  }

  const handleProcessKnowledge = async () => {
    setProcessingFile(true);
    setMessage(null);
    setError(null);

    try {
      let rawText = draft.knowledgeBaseText.trim();

      if (file) {
        rawText = `${rawText}\n\n${await extractTextFromFile(file)}`.trim();
      }

      if (!rawText) {
        setError("Añade texto base o sube un PDF/TXT antes de procesarlo.");
        setProcessingFile(false);
        return;
      }

      const nextSummary = extractKnowledgeSummaryFromText(rawText);
      setDraft((current) => ({
        ...current,
        knowledgeBaseText: rawText,
      }));
      setSummary(nextSummary);
      setMessage("Conocimiento comercial procesado. Ya puedes revisar las sugerencias detectadas.");
    } catch {
      setError("No pude procesar ese archivo. Puedes pegar el texto manualmente y volver a intentarlo.");
    } finally {
      setProcessingFile(false);
    }
  };

  const handleApplySuggestions = () => {
    const currentProfile = formValuesToProfile(draft, profile);
    const enriched = applyKnowledgeSummaryToProfile(
      {
        ...currentProfile,
        knowledgeBaseText: draft.knowledgeBaseText,
      },
      summary,
    );

    setDraft(profileToFormValues(enriched));
    setMessage("He aplicado las sugerencias detectadas sobre los campos vacíos.");
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const nextProfile = sanitizeAccountCommercialProfile({
      ...formValuesToProfile(draft, profile),
      knowledgeSummary: summary,
      onboardingCompleted: true,
    });

    const ok = await saveProfile(nextProfile);

    if (!ok) {
      setError("No pude guardar el perfil comercial.");
      setSaving(false);
      return;
    }

    setMessage(mode === "onboarding" ? "Onboarding comercial completado." : "Perfil comercial actualizado.");
    setSaving(false);

    if (mode === "onboarding") {
      router.replace("/today");
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <PmHero
        eyebrow="Perfil comercial"
        title={mode === "onboarding" ? "Enséñale a ProspectMap cómo vende tu empresa" : "Conocimiento de cuenta"}
        description="Este bloque afina el scoring, las recomendaciones, los mensajes y el informe de cada negocio con reglas claras y controlables."
        actions={
          <>
            <StatusPill label={saveLabel} tone={saveState === "error" ? "rose" : saveState === "local_only" ? "amber" : "cyan"} />
            <StatusPill label={tableAvailable ? "Cuenta sincronizada" : "Guardado temporal"} tone={tableAvailable ? "emerald" : "amber"} />
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <StepCard title="1. ICP" body="Define a quién quieres venderle de verdad." />
        <StepCard title="2. Oferta" body="Aclara qué vendes, qué resuelves y cómo entras." />
        <StepCard title="3. Conocimiento" body="Sube texto o PDF para reforzar el playbook comercial." />
      </section>

      <form className="space-y-4" onSubmit={handleSave}>
        {message ? <PmNotice tone="emerald">{message}</PmNotice> : null}
        {error ? <PmNotice tone="rose">{error}</PmNotice> : null}

        <div className="grid gap-4 2xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <FormSection
              title="Cliente ideal y territorio"
              description="Cuanto mejor expliques a quién quieres vender, más fino será el ranking."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Sector principal">
                  <input
                    value={draft.sector}
                    onChange={(event) => setDraft((current) => ({ ...current, sector: event.target.value }))}
                    className="field"
                    placeholder="Ej. automatización comercial B2B"
                  />
                </Field>
                <Field label="Verticales objetivo">
                  <input
                    value={draft.targetVerticals}
                    onChange={(event) => setDraft((current) => ({ ...current, targetVerticals: event.target.value }))}
                    className="field"
                    placeholder="autoescuelas, clinicas, hoteles"
                  />
                </Field>
              </div>

              <Field label="Subsectores / verticales objetivo">
                <input
                  value={draft.targetSubsectors}
                  onChange={(event) => setDraft((current) => ({ ...current, targetSubsectors: event.target.value }))}
                  className="field"
                  placeholder="clinicas dentales, hoteles boutique, pymes de servicios"
                />
              </Field>

              <Field label="Tipo de cliente ideal">
                <textarea
                  value={draft.targetCustomer}
                  onChange={(event) => setDraft((current) => ({ ...current, targetCustomer: event.target.value }))}
                  rows={3}
                  className="field resize-y"
                  placeholder="Describe el tipo de empresa que mejor encaja"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Empresas que encajan mejor">
                  <textarea
                    value={draft.bestFitCompanyTraits}
                    onChange={(event) => setDraft((current) => ({ ...current, bestFitCompanyTraits: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="varias sedes, recepción saturada, ventas manuales..."
                  />
                </Field>
                <Field label="Empresas que NO encajan">
                  <textarea
                    value={draft.excludedCompanyTraits}
                    onChange={(event) => setDraft((current) => ({ ...current, excludedCompanyTraits: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="muy pequeñas, sin equipo, ticket demasiado bajo..."
                  />
                </Field>
              </div>

              <Field label="Zonas geográficas objetivo">
                <input
                  value={draft.targetGeographies}
                  onChange={(event) => setDraft((current) => ({ ...current, targetGeographies: event.target.value }))}
                  className="field"
                  placeholder="Madrid, Valencia, Andalucía..."
                />
              </Field>
            </FormSection>

            <FormSection
              title="Oferta, objeciones y estilo comercial"
              description="Esto alimenta mensajes, CTA, ángulo y servicio recomendado."
            >
              <Field label="Qué vende exactamente la empresa">
                <textarea
                  value={draft.whatYouSell}
                  onChange={(event) => setDraft((current) => ({ ...current, whatYouSell: event.target.value }))}
                  rows={3}
                  className="field resize-y"
                  placeholder="Describe la oferta principal en una frase clara"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Servicios principales">
                  <textarea
                    value={draft.mainServices}
                    onChange={(event) => setDraft((current) => ({ ...current, mainServices: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="asistente multicanal, automatización interna..."
                  />
                </Field>
                <Field label="Servicios secundarios">
                  <textarea
                    value={draft.secondaryServices}
                    onChange={(event) => setDraft((current) => ({ ...current, secondaryServices: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="avatar IA, SaaS a medida..."
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Rango de precios medio">
                  <input
                    value={draft.averagePriceRange}
                    onChange={(event) => setDraft((current) => ({ ...current, averagePriceRange: event.target.value }))}
                    className="field"
                    placeholder="Ej. 1200-3500 EUR"
                  />
                </Field>
                <Field label="Ticket mínimo deseado">
                  <input
                    value={draft.minimumDesiredTicket}
                    onChange={(event) => setDraft((current) => ({ ...current, minimumDesiredTicket: event.target.value }))}
                    className="field"
                    placeholder="Ej. 2000 EUR"
                  />
                </Field>
              </div>

              <Field label="Problema principal que resuelve">
                <textarea
                  value={draft.mainProblemSolved}
                  onChange={(event) => setDraft((current) => ({ ...current, mainProblemSolved: event.target.value }))}
                  rows={3}
                  className="field resize-y"
                  placeholder="Qué dolor atacas primero en una cuenta buena"
                />
              </Field>

              <Field label="Propuesta de valor">
                <textarea
                  value={draft.valueProposition}
                  onChange={(event) => setDraft((current) => ({ ...current, valueProposition: event.target.value }))}
                  rows={3}
                  className="field resize-y"
                  placeholder="Qué hace a la empresa especialmente creíble o valiosa"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Objeciones típicas">
                  <textarea
                    value={draft.typicalObjections}
                    onChange={(event) => setDraft((current) => ({ ...current, typicalObjections: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="no tenemos tiempo, ya usamos WhatsApp, parece caro..."
                  />
                </Field>
                <Field label="Canales preferidos y prioridades">
                  <textarea
                    value={draft.preferredChannels}
                    onChange={(event) => setDraft((current) => ({ ...current, preferredChannels: event.target.value }))}
                    rows={2}
                    className="field resize-y"
                    placeholder="llamada, WhatsApp, email"
                  />
                  <textarea
                    value={draft.focusPriorities}
                    onChange={(event) => setDraft((current) => ({ ...current, focusPriorities: event.target.value }))}
                    rows={2}
                    className="field resize-y"
                    placeholder="respuesta rápida, recepción saturada, reserva directa..."
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Estilo comercial">
                  <input
                    value={draft.salesStyle}
                    onChange={(event) => setDraft((current) => ({ ...current, salesStyle: event.target.value }))}
                    className="field"
                    placeholder="directo, consultivo, sobrio..."
                  />
                </Field>
                <Field label="CTA preferida">
                  <input
                    value={draft.preferredCta}
                    onChange={(event) => setDraft((current) => ({ ...current, preferredCta: event.target.value }))}
                    className="field"
                    placeholder="agendar demo de 15 min"
                  />
                </Field>
                <Field label="Ángulo comercial recomendado">
                  <input
                    value={draft.recommendedAngles}
                    onChange={(event) => setDraft((current) => ({ ...current, recommendedAngles: event.target.value }))}
                    className="field"
                    placeholder="captación, operación, reservas..."
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Qué revisar antes de contactar">
                  <textarea
                    value={draft.reviewBeforeContact}
                    onChange={(event) => setDraft((current) => ({ ...current, reviewBeforeContact: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="web, reseñas, quién atiende, propuesta actual..."
                  />
                </Field>
                <Field label="Qué no decir">
                  <textarea
                    value={draft.avoidTalkingPoints}
                    onChange={(event) => setDraft((current) => ({ ...current, avoidTalkingPoints: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="no hables de IA sin contexto, no abras con software..."
                  />
                </Field>
              </div>
            </FormSection>
          </div>

          <div className="space-y-4">
            <FormSection
              title="Texto base / PDF comercial"
              description="Opcional. Se procesa localmente para extraer un resumen estructurado útil."
            >
              <Field label="Pega texto base comercial">
                <textarea
                  value={draft.knowledgeBaseText}
                  onChange={(event) => setDraft((current) => ({ ...current, knowledgeBaseText: event.target.value }))}
                  rows={10}
                  className="field resize-y"
                  placeholder="Pega aquí argumentario, PDF convertido a texto, propuesta comercial, dossier..."
                />
              </Field>

              <Field label="O sube PDF / TXT / MD">
                <input
                  type="file"
                  accept=".pdf,.txt,.md,text/plain,application/pdf"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="field file:mr-3 file:rounded-[0.9rem] file:border-0 file:bg-[var(--pm-primary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#1a1209]"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleProcessKnowledge} disabled={processingFile} className="pm-btn pm-btn-primary">
                  <Upload className="h-4 w-4" />
                  {processingFile ? "Procesando..." : "Procesar conocimiento"}
                </button>
                <button type="button" onClick={handleApplySuggestions} disabled={!summaryHasData} className="pm-btn pm-btn-secondary">
                  <Sparkles className="h-4 w-4" />
                  Aplicar sugerencias
                </button>
              </div>

              <p className="pm-caption text-xs">
                Si el PDF sale mal, no bloquea nada: puedes editar el texto y los campos manualmente.
              </p>
            </FormSection>

            <FormSection
              title="Resumen estructurado detectado"
              description="Se usa como fuente complementaria para scoring, mensajes y recomendación."
            >
              <SummaryList title="Servicios detectados" items={summary.detectedServices} icon={FileText} emptyText="Sin servicios detectados todavía." />
              <SummaryList title="Dolores detectados" items={summary.detectedPainPoints} icon={Sparkles} emptyText="Sin dolores detectados todavía." />
              <SummaryList title="Objeciones detectadas" items={summary.detectedObjections} icon={Sparkles} emptyText="Sin objeciones detectadas todavía." />
              <SummaryList title="Propuesta de valor detectada" items={summary.detectedValueProps} icon={Sparkles} emptyText="Sin propuesta de valor detectada todavía." />
              {summary.sourceNote ? <p className="pm-caption text-xs">{summary.sourceNote}</p> : null}
            </FormSection>

            <PmPanel className="p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--pm-text)]">Impacto en ProspectMap</h2>
              <ul className="mt-3 space-y-2 text-sm text-[var(--pm-text-secondary)]">
                <li>• refina el scoring con ICP, oferta y ticket deseado</li>
                <li>• mejora mensajes, CTA, objeciones y ángulo comercial</li>
                <li>• alimenta el informe detallado del negocio</li>
                <li>• deja una base clara para futuras fases de inteligencia comercial</li>
              </ul>
            </PmPanel>
          </div>
        </div>

        <PmPanel className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-[var(--pm-text-secondary)]">
            {mode === "onboarding"
              ? "Guarda este perfil para que ProspectMap empiece a priorizar mejor desde el primer día."
              : "Los cambios se aplican a territorio, prioridades, centro de control e informe detallado."}
          </p>
          <button type="submit" disabled={saving} className="pm-btn pm-btn-primary w-full sm:w-auto">
            {saving
              ? "Guardando..."
              : mode === "onboarding"
                ? "Guardar perfil comercial y entrar"
                : "Guardar perfil comercial"}
          </button>
        </PmPanel>
      </form>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <PmPanel className="p-5">
      <h2 className="text-base font-semibold text-[var(--pm-text)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--pm-text-secondary)]">{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </PmPanel>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="pm-caption font-medium uppercase tracking-[0.12em]">{label}</span>
      {children}
    </label>
  );
}

function StepCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="pm-card">
      <p className="pm-kicker">{title}</p>
      <p className="mt-2 text-sm text-[var(--pm-text-secondary)]">{body}</p>
    </article>
  );
}

function SummaryList({
  title,
  items,
  icon: Icon,
  emptyText,
}: {
  title: string;
  items: string[];
  icon: ComponentType<{ className?: string }>;
  emptyText: string;
}) {
  return (
    <div className="pm-card-soft">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--pm-primary)]" />
        <p className="text-sm font-medium text-[var(--pm-text)]">{title}</p>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-[var(--pm-text-tertiary)]">{emptyText}</p> : null}
        {items.map((item) => (
          <p key={item} className="text-sm text-[var(--pm-text-secondary)]">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "cyan" | "emerald" | "amber" | "rose";
}) {
  return <PmBadge tone={tone === "emerald" ? "emerald" : tone === "amber" ? "amber" : tone === "rose" ? "rose" : "cyan"}>{label}</PmBadge>;
}
