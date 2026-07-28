import type { MortgageStructure } from "../mortgage/MortgageStructure";
import type { Asset } from "../asset/Asset";
import type { ReportData, ReportChart, ReportTableRow } from "./ReportData";
import { compareMortgageStructures } from "../mortgage/compareMortgageStructures";
import { annualSeriesForSchedule } from "../mortgage/annualSeries";
import { formatMoney } from "../shared/formatMoney";

const formatDate = (date: Date | undefined) => date ? date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Up to 3 mortgage scenarios (enforced by the caller/picker, not here), each compared at its
 *  own unmodified structure — mirrors buildStrategyComparisonReport's shape, one column per
 *  candidate. Per-strategy comparison stays a Mortgage Lab-only feature, not reported here. */
export function buildMortgageScenarioComparisonReport(
  candidates: { label: string; structure: MortgageStructure }[],
  assets: Asset[],
  asOf: Date = new Date(),
): ReportData {
  const entries = compareMortgageStructures(candidates, assets);
  const columns = entries.map((entry) => entry.label);

  const summaryRows: ReportTableRow[] = [
    { label: "Total interest", values: entries.map((entry) => formatMoney(entry.totals.totalInterest)) },
    { label: "Total repaid", values: entries.map((entry) => formatMoney(entry.totals.totalRepayment)) },
    { label: "Loan completion", values: entries.map((entry) => formatDate(entry.totals.payoffDate)) },
  ];

  const chart: ReportChart = {
    kind: "trend",
    seriesLabel: "Loan balance",
    series: entries.map((entry) => ({
      label: entry.label,
      points: annualSeriesForSchedule(entry.combinedSchedule).map((point) => ({ year: point.year, value: point.closingBalance })),
    })),
  };

  return {
    title: `Mortgage Scenario Comparison — ${candidates.map((candidate) => candidate.label).join(", ")}`,
    generatedAt: asOf.toISOString(),
    sections: [
      { heading: "Summary", rows: [], table: { columns, rows: summaryRows } },
      { heading: "Loan balance over time", rows: [], chart },
    ],
  };
}
