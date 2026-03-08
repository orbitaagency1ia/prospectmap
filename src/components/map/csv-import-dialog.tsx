"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";

import { CSV_MAX_ROWS, NOMINATIM_MIN_INTERVAL_MS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/types";
import { normalizeText, sleep } from "@/lib/utils";

import { PmNotice } from "../ui/pm";

type ImportRow = {
  rawName: string | null;
  rawAddress: string | null;
  rawPhone: string | null;
  rawEmail: string | null;
  rawCategory: string | null;
  rawContactName: string | null;
  rawNotes: string | null;
};

type ImportErrorRow = ImportRow & {
  errorReason: string;
};

type ImportSummary = {
  imported: number;
  errors: number;
  ignored: number;
};

type Props = {
  open: boolean;
  profile: ProfileRow;
  onClose: () => void;
  onImported: () => Promise<void>;
};

const nameKeys = ["nombre", "name", "empresa", "company", "business", "negocio"];
const addressKeys = ["direccion", "dirección", "address", "street", "calle"];
const phoneKeys = ["telefono", "teléfono", "phone", "movil", "móvil", "whatsapp"];
const emailKeys = ["email", "mail", "correo"];
const categoryKeys = ["categoria", "categoría", "category", "sector", "rubro"];
const contactKeys = ["contacto", "nombre_contacto", "contact_name", "owner_name", "responsable"];
const notesKeys = ["notas", "notes", "comentarios", "comments", "observaciones"];
const cityKeys = ["ciudad", "city", "municipio"];

function findValue(row: Record<string, unknown>, aliases: string[]) {
  const aliasSet = new Set(aliases.map((alias) => normalizeText(alias)));

  for (const [key, value] of Object.entries(row)) {
    if (aliasSet.has(normalizeText(key))) {
      const normalized = String(value ?? "").trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
}

async function parseCsv(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data ?? []);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

export function CsvImportDialog({ open, profile, onClose, onImported }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errorsPreview, setErrorsPreview] = useState<ImportErrorRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleRunImport = async () => {
    if (!file) {
      setMessage("Selecciona un CSV para comenzar.");
      return;
    }

    setLoading(true);
    setMessage(null);
    setSummary(null);
    setErrorsPreview([]);

    try {
      const rows = await parseCsv(file);
      const limitedRows = rows.slice(0, CSV_MAX_ROWS);
      const ignored = Math.max(0, rows.length - limitedRows.length);

      let imported = 0;
      const errors: ImportErrorRow[] = [];

      for (const row of limitedRows) {
        const rawName = findValue(row, nameKeys) || null;
        const rawAddress = findValue(row, addressKeys) || null;
        const rawPhone = findValue(row, phoneKeys) || null;
        const rawEmail = findValue(row, emailKeys) || null;
        const rawCategory = findValue(row, categoryKeys) || null;
        const rawContactName = findValue(row, contactKeys) || null;
        const rawNotes = findValue(row, notesKeys) || null;
        const rowCity = findValue(row, cityKeys) || profile.city_name;

        const baseRow: ImportRow = {
          rawName,
          rawAddress,
          rawPhone,
          rawEmail,
          rawCategory,
          rawContactName,
          rawNotes,
        };

        if (!rawName || !rawAddress) {
          errors.push({
            ...baseRow,
            errorReason: "Faltan campos obligatorios (nombre y/o dirección).",
          });
          continue;
        }

        await sleep(NOMINATIM_MIN_INTERVAL_MS + 100);

        const geocodeRes = await fetch(
          `/api/geocode/address?q=${encodeURIComponent(rawAddress)}&city=${encodeURIComponent(rowCity)}`,
        );

        const geocodePayload = (await geocodeRes.json()) as {
          result: { lat: number; lng: number } | null;
        };

        if (!geocodePayload.result) {
          errors.push({
            ...baseRow,
            errorReason: "No se pudo geocodificar la dirección.",
          });
          continue;
        }

        const { error: insertError } = await supabase.from("businesses").insert({
          user_id: profile.id,
          source: "csv",
          name: rawName,
          address: rawAddress,
          city: rowCity,
          category: rawCategory,
          phone: rawPhone,
          email: rawEmail,
          lat: geocodePayload.result.lat,
          lng: geocodePayload.result.lng,
          owner_name: rawContactName,
          contact_notes: rawNotes,
          prospect_status: "sin_contactar",
          priority: "media",
        });

        if (insertError) {
          errors.push({
            ...baseRow,
            errorReason: `Error insertando en base de datos: ${insertError.message}`,
          });
          continue;
        }

        imported += 1;
      }

      if (errors.length > 0) {
        await supabase.from("csv_import_errors").insert(
          errors.map((entry) => ({
            user_id: profile.id,
            raw_name: entry.rawName,
            raw_address: entry.rawAddress,
            raw_phone: entry.rawPhone,
            raw_email: entry.rawEmail,
            raw_category: entry.rawCategory,
            raw_contact_name: entry.rawContactName,
            raw_notes: entry.rawNotes,
            error_reason: entry.errorReason,
          })),
        );
      }

      setSummary({
        imported,
        errors: errors.length,
        ignored,
      });
      setErrorsPreview(errors.slice(0, 8));

      await onImported();
    } catch {
      setMessage("Error al procesar el CSV. Revisa el formato e inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pm-sheet-backdrop pm-overlay-shell fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <div className="pm-shell pm-sheet-shell w-full max-w-2xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--pm-text)]">Importar CSV</h3>
          <button
            type="button"
            onClick={onClose}
            className="pm-btn pm-btn-secondary min-h-0 px-3 py-2 text-sm"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-[var(--pm-text-secondary)]">
            Obligatorios: <strong>nombre</strong> y <strong>dirección</strong>. Opcionales: teléfono, email, sector, contacto, notas y ciudad.
          </p>

          <label className="block space-y-1 text-sm text-[var(--pm-text-secondary)]">
            Archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="field"
            />
          </label>

          <p className="pm-caption text-xs">Límite: {CSV_MAX_ROWS} filas por importación.</p>

          {message ? (
            <PmNotice tone="rose">{message}</PmNotice>
          ) : null}

          <button type="button" disabled={loading || !file} onClick={handleRunImport} className="pm-btn pm-btn-primary w-full">
            {loading ? "Importando..." : "Ejecutar importación"}
          </button>

          {summary ? (
            <div className="pm-card p-3.5">
              <p className="text-sm text-[var(--pm-text)]">Resumen</p>
              <ul className="mt-2 space-y-1 text-sm text-[var(--pm-text-secondary)]">
                <li>Importados: {summary.imported}</li>
                <li>Errores: {summary.errors}</li>
                <li>Ignorados por límite: {summary.ignored}</li>
              </ul>
            </div>
          ) : null}

          {errorsPreview.length > 0 ? (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-[1.25rem] border border-[var(--pm-border)] bg-[rgba(255,255,255,0.02)] p-3">
              <p className="text-sm text-[var(--pm-text)]">Errores</p>
              {errorsPreview.map((entry, index) => (
                <div key={`${entry.rawName ?? "sin-nombre"}-${index}`} className="pm-list-row rounded-[1rem] px-3 py-2.5">
                  <p className="text-xs text-[var(--pm-text-tertiary)]">{entry.rawName ?? "Sin nombre"}</p>
                  <p className="text-sm text-[var(--pm-danger)]">{entry.errorReason}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
