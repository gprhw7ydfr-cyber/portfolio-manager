import type { ReportData } from "./ReportData";

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function reportToCsv(report: ReportData): string {
  const lines = ["Section,Label,Value"];
  for (const section of report.sections) {
    for (const row of section.rows) {
      lines.push([section.heading, row.label, row.value].map(csvField).join(","));
    }
    if (section.table) {
      for (const row of section.table.rows) {
        section.table.columns.forEach((column, index) => {
          lines.push([section.heading, `${row.label} — ${column}`, row.values[index] ?? ""].map(csvField).join(","));
        });
      }
    }
  }
  return lines.join("\r\n");
}

export function reportToJson(report: ReportData): string {
  return JSON.stringify(report, null, 2);
}

/** The only function in the app that touches the download/Blob browser API — swapping the
 *  mechanism later (e.g. a native save dialog) means reimplementing this, not its callers. */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function slugifyFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
