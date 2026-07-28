import { useMemo, useState } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import { calculateDashboardStats } from "../../domain/dashboard/calculateDashboardStats";
import { calculateDashboardCharts } from "../../domain/dashboard/calculateDashboardCharts";
import { calculateDashboardProjection } from "../../domain/dashboard/calculateDashboardProjection";
import { formatMoney } from "../../domain/shared/formatMoney";
import { ResultCard } from "../mortgage/ResultCard";
import { AssetAllocationChart } from "./AssetAllocationChart";
import { PropertyValuesChart } from "./PropertyValuesChart";
import { TrendLineChart } from "./TrendLineChart";
import { CashFlowProjectionChart } from "./CashFlowProjectionChart";
import { InvestmentMetricsPanel } from "./InvestmentMetricsPanel";
import { getCategorical } from "./chartPalette";
import { useTheme } from "../../store/useTheme";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

type CashFlowUnit = "weekly" | "annually";

export function Dashboard() {
  const [portfolio] = usePortfolio();
  const [theme] = useTheme();
  const [cashFlowUnit, setCashFlowUnit] = useState<CashFlowUnit>("annually");
  const categorical = getCategorical(theme);
  const stats = useMemo(() => calculateDashboardStats(portfolio), [portfolio]);
  const charts = useMemo(() => calculateDashboardCharts(portfolio), [portfolio]);
  const projection = useMemo(() => calculateDashboardProjection(portfolio), [portfolio]);
  // The first point can represent fewer than 52 weeks (a property bought partway through the
  // current calendar year). Its raw total isn't comparable to a full year's, so both "annually"
  // and "weekly" show it annualized up to a full-year run-rate — otherwise the two views tell
  // inconsistent stories (a smaller partial-year total can look "better" than a full year's even
  // when the underlying weekly rate is worse).
  const cashFlowSeries = projection.cashFlowSeries.map((point, index) => {
    const annualizedValue = index === 0 ? (point.value / projection.firstYearWeeks) * 52 : point.value;
    return { ...point, value: cashFlowUnit === "weekly" ? annualizedValue / 52 : annualizedValue };
  });
  const { assumptions } = projection;

  return (
    <div className="dashboard">
      <section className="calculator">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Your financial position.</h2>
            <p className="muted">An overview across every property, mortgage, and account.</p>
          </div>
        </div>
        <div className="dashboard-stats">
          <ResultCard emphasis label="Net worth" value={formatMoney(stats.netWorth)} />
          <ResultCard label="Total assets" value={formatMoney(stats.totalAssets)} />
          <ResultCard label="Total liabilities" value={formatMoney(stats.totalLiabilities)} />
          <ResultCard label="Total cash" value={formatMoney(stats.totalCash)} />
          <ResultCard label="Total equity" value={formatMoney(stats.totalEquity)} supportingText="Property value less mortgage debt" />
          <ResultCard label="Loan-to-value ratio" value={percent(stats.loanToValueRatio)} />
          <ResultCard label="Total interest paid" value={formatMoney(stats.totalInterestPaid)} supportingText="To date" />
          <ResultCard label="Forecast interest remaining" value={formatMoney(stats.forecastInterestRemaining)} />
          <ResultCard label="Portfolio return" value={percent(stats.portfolioReturn)} supportingText="Gross rental yield" />
        </div>
      </section>

      <section className="calculator other-mortgages">
        <InvestmentMetricsPanel portfolio={portfolio} />
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div><p className="eyebrow">Asset allocation</p><h2>Where your value sits.</h2></div>
        </div>
        <AssetAllocationChart slices={charts.assetAllocation} />
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div><p className="eyebrow">Properties</p><h2>Property values.</h2></div>
        </div>
        <PropertyValuesChart properties={charts.propertyValues} />
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Forecast</p>
            <h2>Projected cash flow.</h2>
            <p className="muted">Assumes {assumptions.rentalGrowthRate}% annual rental growth and {assumptions.expenseInflationRate}% annual expense inflation, current holdings only, no strategy changes.</p>
          </div>
          <label className="rate-type">
            <span>Show as</span>
            <select value={cashFlowUnit} onChange={(event) => setCashFlowUnit(event.target.value as CashFlowUnit)}>
              <option value="annually">Annually</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
        </div>
        <CashFlowProjectionChart points={cashFlowSeries} color={categorical.aqua} seriesLabel={cashFlowUnit === "weekly" ? "Weekly cash flow" : "Annual cash flow"} />
        {projection.firstYearWeeks < 52 && (
          <p className="muted">{cashFlowSeries[0]?.year} reflects a partial year ({projection.firstYearWeeks} weeks owned) — shown here as a full-year run-rate so it's comparable to every other year, not the smaller actual dollar total for the months remaining.</p>
        )}
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Forecast</p>
            <h2>Projected net worth.</h2>
            <p className="muted">Assumes {assumptions.propertyGrowthRate}% annual property growth, {assumptions.rentalGrowthRate}% rental growth, and {assumptions.expenseInflationRate}% expense inflation, current holdings only, no strategy changes.</p>
          </div>
        </div>
        <TrendLineChart points={projection.netWorthSeries} color={categorical.green} seriesLabel="Projected net worth" />
      </section>
    </div>
  );
}
