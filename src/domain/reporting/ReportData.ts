import type { AllocationSlice } from "../dashboard/calculateDashboardCharts";

export interface ReportRow {
  label: string;
  value: string;
}

export interface ReportChartPoint {
  year: number;
  value: number;
}

export interface ReportChartSeries {
  label: string;
  points: ReportChartPoint[];
}

export interface ReportNamedValue {
  label: string;
  value: number;
}

/** Builders stay theme-agnostic — series/values carry no color, `ReportView` assigns colors at
 *  render time from the current theme's categorical palette, same as the live comparison views. */
export type ReportChart =
  | { kind: "trend"; seriesLabel: string; series: ReportChartSeries[] }
  | { kind: "bar"; values: ReportNamedValue[] }
  | { kind: "allocation"; slices: AllocationSlice[] };

export interface ReportTableRow {
  label: string;
  /** One pre-formatted value per `ReportTable.columns` entry, same index. */
  values: string[];
}

/** A metric-by-candidate comparison grid — one column per scenario/strategy instead of the
 *  flat "Scenario A net worth" / "Scenario B net worth" label style `rows` uses. Used instead
 *  of `rows` on sections that compare multiple candidates side by side. */
export interface ReportTable {
  columns: string[];
  rows: ReportTableRow[];
}

export interface ReportSection {
  heading: string;
  rows: ReportRow[];
  chart?: ReportChart;
  table?: ReportTable;
}

/** Every report shares this shape — row values are pre-formatted strings, so CSV/JSON export
 *  and the on-screen view all work off one structure instead of six bespoke formats. */
export interface ReportData {
  title: string;
  generatedAt: string;
  sections: ReportSection[];
}
