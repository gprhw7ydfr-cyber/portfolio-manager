import { useState } from "react";
import type { Portfolio } from "../../domain/portfolio/Portfolio";
import type { Scenario } from "../../domain/scenario/Scenario";
import { createDefaultMonteCarloConfig, type MonteCarloConfig, type MonteCarloRunCount, type VolatilityAssumptions } from "../../domain/montecarlo/MonteCarloConfig";
import { runMonteCarloSimulation, type MonteCarloResult } from "../../domain/montecarlo/runMonteCarloSimulation";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import { formatMoney } from "../../domain/shared/formatMoney";
import { ResultCard } from "../mortgage/ResultCard";
import { NetWorthFanChart } from "./NetWorthFanChart";

interface MonteCarloPanelProps {
  portfolio: Portfolio;
  scenario: Scenario;
}

const RUN_COUNTS: MonteCarloRunCount[] = [100, 500, 1000];

const percent = (value: number) => `${(value * 100).toFixed(0)}%`;

export function MonteCarloPanel({ portfolio, scenario }: MonteCarloPanelProps) {
  const [config, setConfig] = useState<MonteCarloConfig>(createDefaultMonteCarloConfig);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const updateVolatility = (changes: Partial<VolatilityAssumptions>) => setConfig((current) => ({
    ...current,
    volatility: { ...current.volatility, ...changes },
  }));

  const runSimulation = () => {
    setIsRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(runMonteCarloSimulation(portfolio, scenario, config));
      setIsRunning(false);
    }, 0);
  };

  return (
    <div className="monte-carlo-panel">
      <div className="payment-plan__heading">
        <div>
          <p className="eyebrow">Monte Carlo</p>
          <h2>How reliable is this plan?</h2>
          <p className="muted">Randomises growth, rental growth, expenses, vacancy, and (if set) the rate override across many runs of this scenario.</p>
        </div>
        <button className="button button--secondary" disabled={isRunning} onClick={runSimulation}>
          {isRunning ? "Running…" : "Run simulation"}
        </button>
      </div>

      <div className="input-grid">
        <label className="input-row">
          <span>Runs</span>
          <span className="input-row__control">
            <select value={config.runs} onChange={(event) => setConfig((current) => ({ ...current, runs: Number(event.target.value) as MonteCarloRunCount }))}>
              {RUN_COUNTS.map((count) => <option key={count} value={count}>{count.toLocaleString()}</option>)}
            </select>
          </span>
        </label>
        <label className="input-row">
          <span>Target net worth</span>
          <span className="input-row__control">
            <b className="input-row__adornment">$</b>
            <input type="number" min="0" step="10000" value={config.targetNetWorth} onFocus={selectIfZero(config.targetNetWorth)} onChange={(event) => setConfig((current) => ({ ...current, targetNetWorth: numberFromInput(current.targetNetWorth, event.target.value) }))} />
          </span>
        </label>
        <label className="input-row">
          <span>Property growth volatility</span>
          <span className="input-row__control">
            <input type="number" min="0" step="0.1" value={config.volatility.propertyGrowthStdDev} onFocus={selectIfZero(config.volatility.propertyGrowthStdDev)} onChange={(event) => updateVolatility({ propertyGrowthStdDev: numberFromInput(config.volatility.propertyGrowthStdDev, event.target.value) })} />
            <span className="input-row__adornment">± pts</span>
          </span>
        </label>
        <label className="input-row">
          <span>Rental growth volatility</span>
          <span className="input-row__control">
            <input type="number" min="0" step="0.1" value={config.volatility.rentalGrowthStdDev} onFocus={selectIfZero(config.volatility.rentalGrowthStdDev)} onChange={(event) => updateVolatility({ rentalGrowthStdDev: numberFromInput(config.volatility.rentalGrowthStdDev, event.target.value) })} />
            <span className="input-row__adornment">± pts</span>
          </span>
        </label>
        <label className="input-row">
          <span>Expense volatility</span>
          <span className="input-row__control">
            <input type="number" min="0" step="0.1" value={config.volatility.expenseInflationStdDev} onFocus={selectIfZero(config.volatility.expenseInflationStdDev)} onChange={(event) => updateVolatility({ expenseInflationStdDev: numberFromInput(config.volatility.expenseInflationStdDev, event.target.value) })} />
            <span className="input-row__adornment">± pts</span>
          </span>
        </label>
        <label className="input-row">
          <span>Vacancy volatility</span>
          <span className="input-row__control">
            <input type="number" min="0" step="0.1" value={config.volatility.vacancyRateStdDev} onFocus={selectIfZero(config.volatility.vacancyRateStdDev)} onChange={(event) => updateVolatility({ vacancyRateStdDev: numberFromInput(config.volatility.vacancyRateStdDev, event.target.value) })} />
            <span className="input-row__adornment">± pts</span>
          </span>
        </label>
        {scenario.assumptions.mortgageRateOverride !== undefined && (
          <label className="input-row">
            <span>Mortgage rate volatility</span>
            <span className="input-row__control">
              <input type="number" min="0" step="0.1" value={config.volatility.mortgageRateStdDev} onFocus={selectIfZero(config.volatility.mortgageRateStdDev)} onChange={(event) => updateVolatility({ mortgageRateStdDev: numberFromInput(config.volatility.mortgageRateStdDev, event.target.value) })} />
              <span className="input-row__adornment">± pts</span>
            </span>
          </label>
        )}
      </div>
      {scenario.assumptions.mortgageRateOverride === undefined && (
        <p className="rate-plan__help">Set a mortgage rate override in this scenario's assumptions to also randomise interest rates — otherwise every run keeps each split's own configured rate.</p>
      )}

      {result && (
        <div className="monte-carlo-results">
          <div className="dashboard-stats">
            <ResultCard emphasis label="Probability of success" value={percent(result.probabilityOfSuccess)} supportingText={`Net worth ≥ ${formatMoney(config.targetNetWorth)} in ${result.netWorthByYear.at(-1)?.year ?? "—"}`} />
            <ResultCard label="Best case" value={formatMoney(result.bestCase)} />
            <ResultCard label="Median" value={formatMoney(result.median)} />
            <ResultCard label="Worst case" value={formatMoney(result.worstCase)} />
            <ResultCard label="10th–90th percentile" value={`${formatMoney(result.p10)} – ${formatMoney(result.p90)}`} supportingText="Risk band" />
            <ResultCard label="Standard deviation" value={formatMoney(result.standardDeviation)} supportingText={`Across ${result.runs.toLocaleString()} runs`} />
          </div>
          <NetWorthFanChart points={result.netWorthByYear} />
        </div>
      )}
    </div>
  );
}
