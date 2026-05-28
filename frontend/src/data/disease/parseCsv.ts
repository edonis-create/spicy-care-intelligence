import Papa from "papaparse";

function normalizeHeader(h: string): string {
  return h.trim().replace(/\s+/g, "_");
}

export function parseCsv<T extends object>(raw: string): T[] {
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });
  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.type === "FieldMismatch");
    if (fatal) {
      throw new Error(`CSV parse error: ${fatal.message}`);
    }
  }
  return parsed.data as T[];
}
