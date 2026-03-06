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
import { cn } from "@/lib/utils";

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
      ? "Guardando..."
      : saveState === "saved"
        ? "Guardado en Supabase"
        : saveState === "local_only"
          ? "Solo local"
          : saveState === "error"
            ? "Error guardando"
            : "Sin cambios";

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
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-400">
        Cargando perfil comercial...
      </section>
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
      <section className="rounded-[28px] border border-slate-800 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94))] p-6 shadow-[0_28px_80px_rgba(2,6,23,0.38)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Perfil comercial</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
              {mode === "onboarding" ? "Enséñale a ProspectMap cómo vende tu empresa" : "Conocimiento de cuenta"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Este bloque alimenta el scoring, las recomendaciones, los mensajes y el informe de cada negocio. No usa
              IA externa: todo se guarda en Supabase y se procesa con reglas deterministas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label={saveLabel} tone={saveState === "error" ? "rose" : saveState === "local_only" ? "amber" : "cyan"} />
            <StatusPill label={tableAvailable ? "Persistencia remota activa" : "Solo local"} tone={tableAvailable ? "emerald" : "amber"} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StepCard title="1. ICP" body="Define a quién quieres venderle de verdad." />
        <StepCard title="2. Oferta" body="Aclara qué vendes, qué resuelves y cómo entras." />
        <StepCard title="3. Conocimiento" body="Sube texto o PDF para reforzar el playbook comercial." />
      </section>

      <form className="space-y-4" onSubmit={handleSave}>
        {message ? (
          <p className="rounded-xl border border-emerald-700/70 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-rose-700/70 bg-rose-900/30 px-4 py-3 text-sm text-rose-200">{error}</p>
        ) : null}

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
                    placeholder="Ej. automatizacion comercial B2B"
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
                    placeholder="varias sedes, recepcion saturada, ventas manuales..."
                  />
                </Field>
                <Field label="Empresas que NO encajan">
                  <textarea
                    value={draft.excludedCompanyTraits}
                    onChange={(event) => setDraft((current) => ({ ...current, excludedCompanyTraits: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="muy pequenas, sin equipo, ticket demasiado bajo..."
                  />
                </Field>
              </div>

              <Field label="Zonas geograficas objetivo">
                <input
                  value={draft.targetGeographies}
                  onChange={(event) => setDraft((current) => ({ ...current, targetGeographies: event.target.value }))}
                  className="field"
                  placeholder="Madrid, Valencia, Andalucia..."
                />
              </Field>
            </FormSection>

            <FormSection
              title="Oferta, objeciones y estilo comercial"
              description="Esto alimenta mensajes, CTA, angulo y servicio recomendado."
            >
              <Field label="Que vende exactamente la empresa">
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
                    placeholder="asistente multicanal, automatizacion interna..."
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
                <Field label="Ticket minimo deseado">
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
                  placeholder="Que dolor atacas primero en una cuenta buena"
                />
              </Field>

              <Field label="Propuesta de valor">
                <textarea
                  value={draft.valueProposition}
                  onChange={(event) => setDraft((current) => ({ ...current, valueProposition: event.target.value }))}
                  rows={3}
                  className="field resize-y"
                  placeholder="Que hace a la empresa especialmente creible o valiosa"
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Objeciones tipicas">
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
                    placeholder="respuesta rapida, recepcion saturada, reserva directa..."
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
                <Field label="Angulo comercial recomendado">
                  <input
                    value={draft.recommendedAngles}
                    onChange={(event) => setDraft((current) => ({ ...current, recommendedAngles: event.target.value }))}
                    className="field"
                    placeholder="captacion, operacion, reservas..."
                  />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Que revisar antes de contactar">
                  <textarea
                    value={draft.reviewBeforeContact}
                    onChange={(event) => setDraft((current) => ({ ...current, reviewBeforeContact: event.target.value }))}
                    rows={4}
                    className="field resize-y"
                    placeholder="web, reseñas, quien atiende, propuesta actual..."
                  />
                </Field>
                <Field label="Que no decir">
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
                  className="field file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-950"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleProcessKnowledge}
                  disabled={processingFile}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {processingFile ? "Procesando..." : "Procesar conocimiento"}
                </button>
                <button
                  type="button"
                  onClick={handleApplySuggestions}
                  disabled={!summaryHasData}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles className="h-4 w-4" />
                  Aplicar sugerencias
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Si el PDF sale mal, no bloquea nada: puedes editar el texto y los campos manualmente.
              </p>
            </FormSection>

            <FormSection
              title="Resumen estructurado detectado"
              description="Se usa como fuente complementaria para scoring, mensajes y recomendacion."
            >
              <SummaryList title="Servicios detectados" items={summary.detectedServices} icon={FileText} emptyText="Sin servicios detectados todavia." />
              <SummaryList title="Dolores detectados" items={summary.detectedPainPoints} icon={Sparkles} emptyText="Sin dolores detectados todavia." />
              <SummaryList title="Objeciones detectadas" items={summary.detectedObjections} icon={Sparkles} emptyText="Sin objeciones detectadas todavia." />
              <SummaryList title="Propuesta de valor detectada" items={summary.detectedValueProps} icon={Sparkles} emptyText="Sin propuesta de valor detectada todavia." />
              {summary.sourceNote ? <p className="text-xs text-slate-500">{summary.sourceNote}</p> : null}
            </FormSection>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-200">Impacto en ProspectMap</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>• refina el scoring con ICP, oferta y ticket deseado</li>
                <li>• mejora mensajes, CTA, objeciones y angulo comercial</li>
                <li>• alimenta el informe detallado del negocio</li>
                <li>• deja una base clara para futuras fases de inteligencia comercial</li>
              </ul>
            </section>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
          <p className="text-sm text-slate-400">
            {mode === "onboarding"
              ? "Guarda este perfil para que ProspectMap empiece a priorizar mejor desde el primer dia."
              : "Los cambios se aplican al mapa, ranking, command center y al informe detallado."}
          </p>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Guardando..."
              : mode === "onboarding"
                ? "Guardar perfil comercial y entrar"
                : "Guardar perfil comercial"}
          </button>
        </div>
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
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
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
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function StepCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <p className="text-xs uppercase tracking-[0.16em] text-cyan-300">{title}</p>
      <p className="mt-2 text-sm text-slate-300">{body}</p>
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
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-300" />
        <p className="text-sm font-medium text-slate-100">{title}</p>
      </div>
      <div className="mt-3 space-y-2">
        {items.length === 0 ? <p className="text-sm text-slate-500">{emptyText}</p> : null}
        {items.map((item) => (
          <p key={item} className="text-sm text-slate-300">
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
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
        tone === "emerald"
          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
          : tone === "amber"
            ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
            : tone === "rose"
              ? "border-rose-500/60 bg-rose-500/15 text-rose-200"
              : "border-cyan-500/60 bg-cyan-500/15 text-cyan-200",
      )}
    >
      {label}
    </span>
  );
}
