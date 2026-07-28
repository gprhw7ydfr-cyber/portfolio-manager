import type { Portfolio } from "../portfolio/Portfolio";
import type { Scenario } from "../scenario/Scenario";
import type { ProjectionYear } from "../scenario/projectPortfolio";
import type { ReportData, ReportTableRow, ReportChart } from "./ReportData";
import { createBaselineScenario } from "../scenario/createDefaultScenario";
import { projectPortfolio } from "../scenario/projectPortfolio";
import { formatMoney } from "../shared/formatMoney";

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
  ];

  const allSeries = [baselineYears, ...perScenario.map(({ years }) => years)];
  const allYears = [...new Set(allSeries.flatMap((years) => years.map((year) => year.year)))].sort((a, b) => a - b);
  const findYear = (years: ProjectionYear[], year: number) => years.find((point) => point.year === year);
  const yearRows: ReportTableRow[] = allYears.map((year) => ({
    label: String(year),
    values: allSeries.map((years) => formatMoney(findYear(years, year)?.netWorth ?? 0)),
  }));

  const chart: ReportChart = {
    kind: "trend",
    seriesLabel: "Net worth",
    series: [
      { label: "Baseline", points: baselineYears.map((year) => ({ year: year.year, value: year.netWorth })) },
      ...perScenario.map(({ scenario, years }) => ({
        label: scenario.name,
        points: years.map((year) => ({ year: year.year, value: year.netWorth })),
      })),
    ],
  };

  return {
    title: `Strategy Comparison — ${scenarios.map((scenario) => scenario.name).join(", ")}`,
    generatedAt: asOf.toISOString(),
    sections: [
      { heading: `Summary (${baselineFinal?.year ?? "—"})`, rows: [], table: { columns, rows: summaryRows } },
      { heading: "Net worth comparison", rows: [], chart },
      { heading: "Net worth by year", rows: [], table: { columns, rows: yearRows } },
    ],
  };
}
