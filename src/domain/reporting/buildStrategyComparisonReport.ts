import type { Portfolio } from "../portfolio/Portfolio";
import type { Scenario } from "../scenario/Scenario";
import type { ReportData, ReportSection } from "./ReportData";
import { createBaselineScenario } from "../scenario/createDefaultScenario";
import { projectPortfolio } from "../scenario/projectPortfolio";
import { formatMoney } from "../shared/formatMoney";

export function buildStrategyComparisonReport(portfolio: Portfolio, scenario: Scenario, asOf: Date = new Date()): ReportData {
  const baselineYears = projectPortfolio(portfolio, createBaselineScenario(scenario.assumptions.projectionYears), asOf);
  const scenarioYears = projectPortfolio(portfolio, scenario, asOf);

  const baselineFinal = baselineYears.at(-1);
  const scenarioFinal = scenarioYears.at(-1);

  const yearSection = (heading: string, years: typeof baselineYears): ReportSection => ({
    heading,
    rows: years.map((year) => ({ label: String(year.year), value: formatMoney(year.netWorth) })),
  });

  return {
    title: `Strategy Comparison — ${scenario.name}`,
    generatedAt: asOf.toISOString(),
    sections: [
      {
        heading: `Summary (${scenarioFinal?.year ?? "—"})`,
        rows: [
          { label: "Baseline net worth", value: formatMoney(baselineFinal?.netWorth ?? 0) },
          { label: `${scenario.name} net worth`, value: formatMoney(scenarioFinal?.netWorth ?? 0) },
          { label: "Net worth difference", value: formatMoney((scenarioFinal?.netWorth ?? 0) - (baselineFinal?.netWorth ?? 0)) },
          { label: "Baseline total interest paid", value: formatMoney(baselineFinal?.totalInterestPaid ?? 0) },
          { label: `${scenario.name} total interest paid`, value: formatMoney(scenarioFinal?.totalInterestPaid ?? 0) },
          { label: "Baseline annual cash flow", value: formatMoney(baselineFinal?.annualCashFlow ?? 0) },
          { label: `${scenario.name} annual cash flow`, value: formatMoney(scenarioFinal?.annualCashFlow ?? 0) },
        ],
      },
      yearSection("Net worth by year — Baseline", baselineYears),
      yearSection(`Net worth by year — ${scenario.name}`, scenarioYears),
    ],
  };
}
