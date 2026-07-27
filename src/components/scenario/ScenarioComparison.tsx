import { useMemo } from "react";
import type { Portfolio } from "../../domain/portfolio/Portfolio";
import type { Scenario } from "../../domain/scenario/Scenario";
import { createBaselineScenario } from "../../domain/scenario/createDefaultScenario";
import { projectPortfolio } from "../../domain/scenario/projectPortfolio";
import { formatMoney } from "../../domain/shared/formatMoney";
import { ResultCard } from "../mortgage/ResultCard";
import { MultiSeriesTrendChart } from "./MultiSeriesTrendChart";
import { CATEGORICAL } from "../dashboard/chartPalette";

interface ScenarioComparisonProps {
  portfolio: Portfolio;
  scenario: Scenario;
}

export function ScenarioComparison({ portfolio, scenario }: ScenarioComparisonProps) {
  const baselineYears = useMemo(
    () => projectPortfolio(portfolio, createBaselineScenario(scenario.assumptions.projectionYears)),
    [portfolio, scenario.assumptions.projectionYears],
  );
  const scenarioYears = useMemo(() => projectPortfolio(portfolio, scenario), [portfolio, scenario]);

  const baselineFinal = baselineYears.at(-1);
  const scenarioFinal = scenarioYears.at(-1);

  return (
    <div className="scenario-comparison">
      <div className="calculator__heading">
        <div><p className="eyebrow">Comparison</p><h2>Baseline vs. {scenario.name}.</h2></div>
      </div>

      <div className="scenario-comparison__table">
        <div className="scenario-comparison__row scenario-comparison__row--header">
          <span></span>
          <span>Baseline</span>
          <span>{scenario.name}</span>
        </div>
        <div className="scenario-comparison__row">
          <span>Net worth in {scenarioFinal?.year ?? "—"}</span>
          <span>{formatMoney(baselineFinal?.netWorth ?? 0)}</span>
          <span>{formatMoney(scenarioFinal?.netWorth ?? 0)}</span>
        </div>
        <div className="scenario-comparison__row">
          <span>Total interest paid</span>
          <span>{formatMoney(baselineFinal?.totalInterestPaid ?? 0)}</span>
          <span>{formatMoney(scenarioFinal?.totalInterestPaid ?? 0)}</span>
        </div>
        <div className="scenario-comparison__row">
          <span>Annual cash flow in {scenarioFinal?.year ?? "—"}</span>
          <span>{formatMoney(baselineFinal?.annualCashFlow ?? 0)}</span>
          <span>{formatMoney(scenarioFinal?.annualCashFlow ?? 0)}</span>
        </div>
      </div>

      <div className="dashboard-stats">
        <ResultCard
          label="Net worth difference"
          value={formatMoney((scenarioFinal?.netWorth ?? 0) - (baselineFinal?.netWorth ?? 0))}
          supportingText={`vs. baseline in ${scenarioFinal?.year ?? "—"}`}
        />
      </div>

      <MultiSeriesTrendChart
        seriesLabel="Net worth"
        series={[
          { label: "Baseline", color: CATEGORICAL.blue, points: baselineYears.map((year) => ({ year: year.year, value: year.netWorth })) },
          { label: scenario.name, color: CATEGORICAL.orange, points: scenarioYears.map((year) => ({ year: year.year, value: year.netWorth })) },
        ]}
      />
    </div>
  );
}
