import { useMemo, useState } from "react";
import type { Portfolio } from "../../domain/portfolio/Portfolio";
import type { PropertyAsset } from "../../domain/property/PropertyAsset";
import {
  calculatePortfolioInvestmentMetrics,
  calculatePropertyInvestmentMetrics,
  DEFAULT_ASSUMED_GROWTH_RATE,
  DEFAULT_PROJECTION_YEARS,
} from "../../domain/dashboard/calculateInvestmentMetrics";
import { formatMoney } from "../../domain/shared/formatMoney";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import { ResultCard } from "../mortgage/ResultCard";

type RoiMode = "since-purchase" | "forward-projection";

interface InvestmentMetricsPanelProps {
  portfolio: Portfolio;
  /** Per-property metrics when set; portfolio-wide aggregate when omitted. */
  property?: PropertyAsset;
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function InvestmentMetricsPanel({ portfolio, property }: InvestmentMetricsPanelProps) {
  const [mode, setMode] = useState<RoiMode>("since-purchase");
  const [projectionYears, setProjectionYears] = useState(DEFAULT_PROJECTION_YEARS);
  const [assumedGrowthRate, setAssumedGrowthRate] = useState(DEFAULT_ASSUMED_GROWTH_RATE);

  const metrics = useMemo(() => {
    const forward = { projectionYears, assumedGrowthRate };
    return property
      ? calculatePropertyInvestmentMetrics(property, portfolio, forward)
      : calculatePortfolioInvestmentMetrics(portfolio, forward);
  }, [property, portfolio, projectionYears, assumedGrowthRate]);

  const roi = mode === "since-purchase" ? metrics.roiSincePurchase : metrics.roiForwardProjection;
  const roiPeriodLabel = mode === "since-purchase"
    ? `${metrics.roiSincePurchase.yearsHeld.toFixed(1)} years held`
    : `${projectionYears} years`;

  return (
    <div className="investment-metrics-panel">
      <div className="payment-plan__heading">
        <div>
          <p className="eyebrow">Investment metrics</p>
          <h2>Return and serviceability.</h2>
          <p className="muted">Cash-on-Cash Return and DSCR reflect today; ROI can look back at what's actually happened or project forward.</p>
        </div>
      </div>

      <div className="input-grid">
        <label className="rate-type">
          <span>ROI basis</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as RoiMode)}>
            <option value="since-purchase">Since purchase</option>
            <option value="forward-projection">Forward projection</option>
          </select>
        </label>
        {mode === "forward-projection" && (
          <>
            <label className="input-row">
              <span>Projection length</span>
              <span className="input-row__control">
                <input type="number" min="1" max="40" value={projectionYears} onFocus={selectIfZero(projectionYears)} onChange={(e) => setProjectionYears(numberFromInput(projectionYears, e.target.value))} />
                <span className="input-row__adornment">years</span>
              </span>
            </label>
            <label className="input-row">
              <span>Assumed growth rate</span>
              <span className="input-row__control">
                <input type="number" step="0.1" value={assumedGrowthRate} onFocus={selectIfZero(assumedGrowthRate)} onChange={(e) => setAssumedGrowthRate(numberFromInput(assumedGrowthRate, e.target.value))} />
                <span className="input-row__adornment">% p.a.</span>
              </span>
            </label>
          </>
        )}
      </div>

      <div className="dashboard-stats">
        <ResultCard label="Cash invested" value={formatMoney(metrics.cashInvested)} />
        <ResultCard label="Cash-on-Cash Return" value={percent(metrics.cashOnCashReturn)} supportingText="Annual cash flow / cash invested" />
        <ResultCard
          label="DSCR"
          value={metrics.debtServiceAnnual > 0 ? `${metrics.dscr.toFixed(2)}x` : "—"}
          supportingText={metrics.debtServiceAnnual > 0 ? "Net operating income / debt service" : "No mortgage attached"}
        />
        <ResultCard
          emphasis
          label={mode === "since-purchase" ? "ROI since purchase (annualized)" : "Projected ROI (annualized)"}
          value={percent(roi.annualizedPercent)}
          supportingText={`${percent(roi.totalPercent)} total over ${roiPeriodLabel}`}
        />
      </div>
    </div>
  );
}
