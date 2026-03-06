"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";

import { CSV_MAX_ROWS, NOMINATIM_MIN_INTERVAL_MS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/lib/types";
import { normalizeText, sleep } from "@/lib/utils";

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-cyan-900/30 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">Importar negocios desde CSV</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-700 px-2 py-1 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            Campos obligatorios: <strong>nombre</strong> y <strong>dirección</strong>. Opcionales: teléfono, email,
            sector, contacto, notas, ciudad.
          </p>

          <label className="block space-y-1 text-sm text-slate-300">
            Archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            />
          </label>

          <p className="text-xs text-slate-500">
            Límite MVP: {CSV_MAX_ROWS} filas por importación para proteger Nominatim y evitar bloqueos.
          </p>

          {message ? (
            <p className="rounded-lg border border-rose-700/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-200">
              {message}
            </p>
          ) : null}

          <button
            type="button"
            disabled={loading || !file}
            onClick={handleRunImport}
            className="w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Importando..." : "Ejecutar importación"}
          </button>

          {summary ? (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-sm text-slate-200">Resumen de importación</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                <li>Importados: {summary.imported}</li>
                <li>Errores: {summary.errors}</li>
                <li>Ignorados por límite: {summary.ignored}</li>
              </ul>
            </div>
          ) : null}

          {errorsPreview.length > 0 ? (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-sm text-slate-200">Muestra de errores</p>
              {errorsPreview.map((entry, index) => (
                <div key={`${entry.rawName ?? "sin-nombre"}-${index}`} className="rounded-lg border border-slate-800 p-2">
                  <p className="text-xs text-slate-400">{entry.rawName ?? "Sin nombre"}</p>
                  <p className="text-sm text-rose-300">{entry.errorReason}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
