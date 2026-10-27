import { NodeExecutor } from "../types";

function jsonToCsv(items: Record<string, unknown>[]): string {
  if (!Array.isArray(items) || items.length === 0) return "";
  const headers = Array.from(new Set(items.flatMap((item) => Object.keys(item))));
  const rows = [headers.join(",")];

  for (const item of items) {
    const row = headers.map((header) => {
      const val = item[header];
      if (val === null || val === undefined) return '""';
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    });
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function csvToJson(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // Split by comma ignoring commas inside quotes
    const values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((v) =>
      v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
    );

    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[j] ?? "";
    }
    result.push(obj);
  }

  return result;
}

const csvNode: NodeExecutor = async (config, input) => {
  const mode = (config.mode as string) || "jsonToCsv";

  if (mode === "csvToJson") {
    const rawCsv = typeof config.csvData === "string" ? config.csvData : String(input ?? "");
    const data = csvToJson(rawCsv);
    return {
      rowCount: data.length,
      data,
    };
  } else {
    // JSON to CSV
    let list: Record<string, unknown>[] = [];
    if (Array.isArray(input)) {
      list = input.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null);
    } else if (input && typeof input === "object") {
      list = [input as Record<string, unknown>];
    }

    const csv = jsonToCsv(list);
    return {
      csv,
      rowCount: list.length,
    };
  }
};

export default csvNode;
