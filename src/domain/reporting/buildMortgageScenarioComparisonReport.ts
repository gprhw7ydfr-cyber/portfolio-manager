import type { MortgageStructure } from "../mortgage/MortgageStructure";
import type { Asset } from "../asset/Asset";
import type { AmortizationPayment } from "../mortgage/AmortizationPayment";
import type { ReportData, ReportChart, ReportChartPoint, ReportTableRow } from "./ReportData";
import { compareMortgageStructures } from "../mortgage/compareMortgageStructures";
import { annualSeriesForSchedule } from "../mortgage/annualSeries";
import { annualAmortizationSummary } from "../mortgage/amortizationDetail";
import { formatMoney } from "../shared/formatMoney";

const formatDate = (date: Date | undefined) => date ? date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Effective annual rate — interest paid ÷ average balance held that year — rather than the
 *  combined schedule's own `annualInterestRate` (always 0 once split rates are summed together,
 *  since a blended rate isn't meaningful per-payment). Moves year to year when a candidate's
 *  splits refix or change rate at different times, which is exactly what's useful to compare. */
function effectiveRateSeries(schedule: AmortizationPayment[]): ReportChartPoint[] {
  return annualAmortizationSummary(schedule).map((row) => {
    const averageBalance = (row.openingBalance + row.closingBalance) / 2;
    return { year: row.year, value: averageBalance > 0 ? row.interestPaid / averageBalance : 0 };
  });
}

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

  const yieldChart: ReportChart = {
    kind: "trend",
    seriesLabel: "Effective interest rate",
    format: "percent",
    series: entries.map((entry) => ({
      label: entry.label,
      points: effectiveRateSeries(entry.combinedSchedule),
    })),
  };

  return {
    title: `Mortgage Scenario Comparison — ${candidates.map((candidate) => candidate.label).join(", ")}`,
    generatedAt: asOf.toISOString(),
    sections: [
      { heading: "Summary", rows: [], table: { columns, rows: summaryRows } },
      { heading: "Loan balance over time", rows: [], chart },
      { heading: "Effective interest rate over time", rows: [], chart: yieldChart },
    ],
  };
}
