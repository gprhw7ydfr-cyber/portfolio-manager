import { useMemo, useState } from "react";
import type { Portfolio } from "../../domain/portfolio/Portfolio";
import type { Scenario } from "../../domain/scenario/Scenario";
import { createBaselineScenario } from "../../domain/scenario/createDefaultScenario";
import { projectPortfolio, type ProjectionYear } from "../../domain/scenario/projectPortfolio";
import { formatMoney, formatCompactMoney } from "../../domain/shared/formatMoney";
import { ResultCard } from "../mortgage/ResultCard";
import { MultiSeriesTrendChart } from "./MultiSeriesTrendChart";
import { getCategorical } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";

interface ScenarioComparisonProps {
  portfolio: Portfolio;
  scenario: Scenario;
}

type ComparisonMetric = "netWorth" | "yield" | "cashOnCash" | "dscr" | "roi";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const multiplier = (value: number) => `${value.toFixed(2)}x`;

interface MetricConfig {
  label: string;
  seriesLabel: string;
  getValue: (year: ProjectionYear) => number;
  formatValue: (value: number) => string;
  formatCompactValue: (value: number) => string;
}

const METRICS: Record<ComparisonMetric, MetricConfig> = {
  netWorth: { label: "Net worth", seriesLabel: "Net worth", getValue: (year) => year.netWorth, formatValue: formatMoney, formatCompactValue: formatCompactMoney },
  yield: { label: "Gross rental yield", seriesLabel: "Gross rental yield", getValue: (year) => year.grossRentalYield, formatValue: percent, formatCompactValue: percent },
  cashOnCash: { label: "Cash-on-Cash Return", seriesLabel: "Cash-on-Cash Return", getValue: (year) => year.cashOnCashReturn, formatValue: percent, formatCompactValue: percent },
  dscr: { label: "DSCR", seriesLabel: "DSCR", getValue: (year) => year.dscr, formatValue: multiplier, formatCompactValue: multiplier },
  roi: { label: "ROI", seriesLabel: "Cumulative ROI", getValue: (year) => year.cumulativeRoi, formatValue: percent, formatCompactValue: percent },
};

export function ScenarioComparison({ portfolio, scenario }: ScenarioComparisonProps) {
  const [theme] = useTheme();
  const categorical = getCategorical(theme);
  const [metric, setMetric] = useState<ComparisonMetric>("netWorth");

  const baselineYears = useMemo(
    () => projectPortfolio(portfolio, createBaselineScenario(scenario.assumptions.projectionYears)),
    [portfolio, scenario.assumptions.projectionYears],
  );
  const scenarioYears = useMemo(() => projectPortfolio(portfolio, scenario), [portfolio, scenario]);

  const baselineFinal = baselineYears.at(-1);
  const scenarioFinal = scenarioYears.at(-1);
  const selected = METRICS[metric];

  return (
    <div className="scenario-comparison">
      <div className="calculator__heading">
        <div><p className="eyebrow">Comparison</p><h2>Baseline vs. {scenario.name}.</h2></div>
        <label className="rate-type">
          <span>Show as</span>
          <select value={metric} onChange={(event) => setMetric(event.target.value as ComparisonMetric)}>
            {(Object.keys(METRICS) as ComparisonMetric[]).map((key) => (
              <option key={key} value={key}>{METRICS[key].label}</option>
            ))}
          </select>
        </label>
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
        <div className="scenario-comparison__row">
          <span>Gross rental yield in {scenarioFinal?.year ?? "—"}</span>
          <span>{percent(baselineFinal?.grossRentalYield ?? 0)}</span>
          <span>{percent(scenarioFinal?.grossRentalYield ?? 0)}</span>
        </div>
        <div className="scenario-comparison__row">
          <span>Cash-on-Cash Return in {scenarioFinal?.year ?? "—"}</span>
          <span>{percent(baselineFinal?.cashOnCashReturn ?? 0)}</span>
          <span>{percent(scenarioFinal?.cashOnCashReturn ?? 0)}</span>
        </div>
        <div className="scenario-comparison__row">
          <span>DSCR in {scenarioFinal?.year ?? "—"}</span>
          <span>{multiplier(baselineFinal?.dscr ?? 0)}</span>
          <span>{multiplier(scenarioFinal?.dscr ?? 0)}</span>
        </div>
        <div className="scenario-comparison__row">
          <span>ROI since {baselineYears[0]?.year ?? "—"}</span>
          <span>{percent(baselineFinal?.cumulativeRoi ?? 0)}</span>
          <span>{percent(scenarioFinal?.cumulativeRoi ?? 0)}</span>
        </div>
      </div>

      <div className="dashboard-stats">
        <ResultCard
          label="Net worth difference"
          value={formatMoney((scenarioFinal?.netWorth ?? 0) - (baselineFinal?.netWorth ?? 0))}
          supportingText={`vs. baseline in ${scenarioFinal?.year ?? "—"}`}
        />
        <ResultCard
          label="Yield difference"
          value={percent((scenarioFinal?.grossRentalYield ?? 0) - (baselineFinal?.grossRentalYield ?? 0))}
          supportingText={`vs. baseline in ${scenarioFinal?.year ?? "—"}`}
        />
        <ResultCard
          label="Cash-on-Cash Return difference"
          value={percent((scenarioFinal?.cashOnCashReturn ?? 0) - (baselineFinal?.cashOnCashReturn ?? 0))}
          supportingText={`vs. baseline in ${scenarioFinal?.year ?? "—"}`}
        />
        <ResultCard
          label="DSCR difference"
          value={multiplier((scenarioFinal?.dscr ?? 0) - (baselineFinal?.dscr ?? 0))}
          supportingText={`vs. baseline in ${scenarioFinal?.year ?? "—"}`}
        />
        <ResultCard
          label="ROI difference"
          value={percent((scenarioFinal?.cumulativeRoi ?? 0) - (baselineFinal?.cumulativeRoi ?? 0))}
          supportingText={`vs. baseline since ${baselineYears[0]?.year ?? "—"}`}
        />
      </div>

      <MultiSeriesTrendChart
        seriesLabel={selected.seriesLabel}
        formatValue={selected.formatValue}
        formatCompactValue={selected.formatCompactValue}
        series={[
          { label: "Baseline", color: categorical.blue, points: baselineYears.map((year) => ({ year: year.year, value: selected.getValue(year) })) },
          { label: scenario.name, color: categorical.orange, points: scenarioYears.map((year) => ({ year: year.year, value: selected.getValue(year) })) },
        ]}
      />
    </div>
  );
}
