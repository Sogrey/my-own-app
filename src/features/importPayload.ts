import JSZip from "jszip";
import { isCollectionName, type CollectionName } from "../../shared/schema";
import { parseCsv } from "../../shared/csv";

export type ImportPreview = {
  source: "zip" | "csv";
  collections: Partial<Record<CollectionName, Array<Record<string, unknown>>>>;
};

function coerceRow(row: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(row)) {
    if (raw === "") {
      result[key] = null;
      continue;
    }
    if (raw === "true" || raw === "false") {
      result[key] = raw === "true";
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      result[key] = Number(raw);
      continue;
    }
    result[key] = raw;
  }
  return result;
}

export async function parseImportFile(file: File): Promise<ImportPreview> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip")) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const allData = zip.file("all-data.json");
    if (allData) {
      const parsed = JSON.parse(await allData.async("string")) as Record<string, unknown>;
      const collections: ImportPreview["collections"] = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (!isCollectionName(key) || !Array.isArray(value)) continue;
        collections[key] = value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
      }
      return { source: "zip", collections };
    }
    const collections: ImportPreview["collections"] = {};
    for (const [path, entry] of Object.entries(zip.files)) {
      if (entry.dir || !path.startsWith("csv/") || !path.endsWith(".csv")) continue;
      const collection = path.slice("csv/".length, -".csv".length);
      if (!isCollectionName(collection)) continue;
      const rows = parseCsv(await entry.async("string")).map(coerceRow);
      if (rows.length) collections[collection] = rows;
    }
    return { source: "zip", collections };
  }
  if (name.endsWith(".csv")) {
    const base = file.name.replace(/\.csv$/i, "");
    if (!isCollectionName(base)) {
      throw new Error("CSV 文件名需为集合名，例如 mediaContents.csv");
    }
    const rows = parseCsv(await file.text()).map(coerceRow);
    return { source: "csv", collections: { [base]: rows } };
  }
  throw new Error("仅支持导出 ZIP 或模块 CSV");
}

export function summarizeImport(collections: ImportPreview["collections"]): Array<{ collection: CollectionName; count: number }> {
  return (Object.entries(collections) as Array<[CollectionName, Array<Record<string, unknown>>]>)
    .filter(([, rows]) => rows.length > 0)
    .map(([collection, rows]) => ({ collection, count: rows.length }))
    .sort((a, b) => a.collection.localeCompare(b.collection));
}
