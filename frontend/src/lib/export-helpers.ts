export interface CsvSection {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface CsvDocument {
  reportLabel: string;
  scopeLabel: string;
  generatedLabel: string;
  sections: CsvSection[];
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowToCsvLine(cells: (string | number)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

/** Builds a single CSV file from a metadata preamble plus one or more labeled sections. */
export function buildCsv(doc: CsvDocument): string {
  const lines: string[] = [];
  lines.push(rowToCsvLine([doc.reportLabel]));
  lines.push(rowToCsvLine(["Scope", doc.scopeLabel]));
  lines.push(rowToCsvLine(["Generated", doc.generatedLabel]));

  for (const section of doc.sections) {
    lines.push("");
    if (section.title) lines.push(rowToCsvLine([section.title]));
    lines.push(rowToCsvLine(section.headers));
    for (const row of section.rows) lines.push(rowToCsvLine(row));
  }

  return lines.join("\r\n");
}

/** Triggers a real browser download of the given CSV content — no backend involved. */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** Total number of data rows across all sections — used to drive disabled/empty states. */
export function countCsvRows(sections: CsvSection[]): number {
  return sections.reduce((sum, s) => sum + s.rows.length, 0);
}

export function slugifyFilename(...parts: string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
