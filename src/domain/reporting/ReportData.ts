export interface ReportRow {
  label: string;
  value: string;
}

export interface ReportSection {
  heading: string;
  rows: ReportRow[];
}

/** Every report shares this shape — row values are pre-formatted strings, so CSV/JSON export
 *  and the on-screen view all work off one structure instead of six bespoke formats. */
export interface ReportData {
  title: string;
  generatedAt: string;
  sections: ReportSection[];
}
