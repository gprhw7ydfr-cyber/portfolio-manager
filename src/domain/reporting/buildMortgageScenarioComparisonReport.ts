import type { MortgageScenario } from "../mortgage/MortgageScenario";
import type { MortgageStrategy } from "../mortgage/MortgageStrategy";
import type { Asset } from "../asset/Asset";
import type { ReportData, ReportSection } from "./ReportData";
import { applyMortgageStrategy } from "../mortgage/applyMortgageStrategy";
import { compareMortgageStructures } from "../mortgage/compareMortgageStructures";
import { formatMoney } from "../shared/formatMoney";

const formatDate = (date: Date | undefined) => date ? date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** One scenario against its own strategies — mirrors buildStrategyComparisonReport's
 *  baseline-vs-one-scenario shape. Free-form N-way comparison across saved scenarios is already
 *  available live in the Mortgage Lab; this report stays scoped to the same shape as its
 *  portfolio-wide counterpart rather than duplicating an open-ended picker. */
export function buildMortgageScenarioComparisonReport(
  scenario: MortgageScenario,
  strategies: MortgageStrategy[],
  assets: Asset[],
  asOf: Date = new Date(),
): ReportData {
  const candidates = [
    { label: "Scenario baseline", structure: scenario },
    ...strategies.map((strategy) => ({ label: strategy.name, structure: applyMortgageStrategy(scenario, strategy, assets, asOf) })),
  ];
  const entries = compareMortgageStructures(candidates, assets);

  const summarySection: ReportSection = {
    heading: "Summary",
    rows: entries.flatMap((entry) => [
      { label: `${entry.label} — total interest`, value: formatMoney(entry.totals.totalInterest) },
      { label: `${entry.label} — total repaid`, value: formatMoney(entry.totals.totalRepayment) },
      { label: `${entry.label} — loan completion`, value: formatDate(entry.totals.payoffDate) },
    ]),
  };

  return {
    title: `Mortgage Scenario Comparison — ${scenario.name}`,
    generatedAt: asOf.toISOString(),
    sections: [summarySection],
  };
}
