import * as XLSX from "xlsx";
import { format } from "date-fns";

export type ParsedSheet = {
  headers: string[];
  rows: Record<string, unknown>[];
};

export function parseWorkbookFirstSheet(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  const normalized = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      out[String(k).trim()] = normalizeCell(v);
    }
    return out;
  });

  return { headers, rows: normalized };
}

function normalizeCell(v: unknown): unknown {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return format(v, "yyyy-MM-dd");
  }
  if (typeof v === "number" && v > 30000 && v < 60000) {
    const utcDays = Math.floor(v - 25569);
    const dt = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dt.getTime())) return format(dt, "yyyy-MM-dd");
  }
  return v;
}

export function normalizePlanValue(raw: string): "student" | "general" {
  const s = raw.toLowerCase().trim();
  if (s.includes("student")) return "student";
  return "general";
}
