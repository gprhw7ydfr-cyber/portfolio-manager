import type { Portfolio } from "../portfolio/Portfolio";
import type { Scenario } from "../scenario/Scenario";
import type { ProjectionYear } from "../scenario/projectPortfolio";
import type { ReportData, ReportTableRow, ReportChart, ReportSection } from "./ReportData";
import { createBaselineScenario } from "../scenario/createDefaultScenario";
import { projectPortfolio } from "../scenario/projectPortfolio";
import { formatMoney } from "../shared/formatMoney";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const multiplier = (value: number) => `${value.toFixed(2)}x`;

/** Up to 3 scenarios (enforced by the caller/picker, not here) shown side by side against one
 *  shared baseline — the baseline's horizon is the longest of the selected scenarios' so every
 *  series has a baseline point to compare against for its full length. Summary and year-by-year
 *  figures render as one column per candidate rather than a flat "Scenario A net worth" /
 *  "Scenario B net worth" row list, so candidates line up for direct comparison. */
export function buildStrategyComparisonReport(portfolio: Portfolio, scenarios: Scenario[], asOf: Date = new Date()): ReportData {
  const horizon = Math.max(...scenarios.map((scenario) => scenario.assumptions.projectionYears));
  const baselineYears = projectPortfolio(portfolio, createBaselineScenario(horizon), asOf);
  const perScenario = scenarios.map((scenario) => ({ scenario, years: projectPortfolio(portfolio, scenario, asOf) }));

  const baselineFinal = baselineYears.at(-1);
  const columns = ["Baseline", ...scenarios.map((scenario) => scenario.name)];
  const finals = [baselineFinal, ...perScenario.map(({ years }) => years.at(-1))];

  const summaryRows: ReportTableRow[] = [
    { label: "Net worth", values: finals.map((year) => formatMoney(year?.netWorth ?? 0)) },
    { label: "Net worth vs. baseline", values: finals.map((year) => year === baselineFinal ? "—" : formatMoney((year?.netWorth ?? 0) - (baselineFinal?.netWorth ?? 0))) },
    { label: "Total interest paid", values: finals.map((year) => formatMoney(year?.totalInterestPaid ?? 0)) },
    { label: "Annual cash flow", values: finals.map((year) => formatMoney(year?.annualCashFlow ?? 0)) },
    { label: "Gross rental yield", values: finals.map((year) => percent(year?.grossRentalYield ?? 0)) },
    { label: "Cash-on-Cash Return", values: finals.map((year) => percent(year?.cashOnCashReturn ?? 0)) },
    { label: "DSCR", values: finals.map((year) => multiplier(year?.dscr ?? 0)) },
    { label: "ROI", values: finals.map((year) => percent(year?.cumulativeRoi ?? 0)) },
  ];

  const allSeries = [baselineYears, ...perScenario.map(({ years }) => years)];
  const allYears = [...new Set(allSeries.flatMap((years) => years.map((year) => year.year)))].sort((a, b) => a - b);
  const findYear = (years: ProjectionYear[], year: number) => years.find((point) => point.year === year);
  const yearRows: ReportTableRow[] = allYears.map((year) => ({
    label: String(year),
    values: allSeries.map((years) => formatMoney(findYear(years, year)?.netWorth ?? 0)),
  }));

  /** Every metric's baseline-vs-scenario chart shares this exact shape — only the label, value
   *  accessor, and format (money/percent/multiplier) differ. */
  const buildMetricChart = (
    seriesLabel: string,
    getValue: (year: ProjectionYear) => number,
    format?: "percent" | "multiplier",
  ): ReportChart => ({
    kind: "trend",
    seriesLabel,
    format,
    series: [
      { label: "Baseline", points: baselineYears.map((year) => ({ year: year.year, value: getValue(year) })) },
      ...perScenario.map(({ scenario, years }) => ({
        label: scenario.name,
        points: years.map((year) => ({ year: year.year, value: getValue(year) })),
      })),
    ],
  });

  const chartSections: ReportSection[] = [
    { heading: "Net worth comparison", rows: [], chart: buildMetricChart("Net worth", (year) => year.netWorth) },
    { heading: "Gross rental yield comparison", rows: [], chart: buildMetricChart("Gross rental yield", (year) => year.grossRentalYield, "percent") },
    { heading: "Cash-on-Cash Return comparison", rows: [], chart: buildMetricChart("Cash-on-Cash Return", (year) => year.cashOnCashReturn, "percent") },
    { heading: "DSCR comparison", rows: [], chart: buildMetricChart("DSCR", (year) => year.dscr, "multiplier") },
    { heading: "ROI comparison", rows: [], chart: buildMetricChart("Cumulative ROI", (year) => year.cumulativeRoi, "percent") },
  ];

  return {
    title: `Strategy Comparison — ${scenarios.map((scenario) => scenario.name).join(", ")}`,
    generatedAt: asOf.toISOString(),
    sections: [
      { heading: `Summary (${baselineFinal?.year ?? "—"})`, rows: [], table: { columns, rows: summaryRows } },
      ...chartSections,
      { heading: "Net worth by year", rows: [], table: { columns, rows: yearRows } },
    ],
  };
}
