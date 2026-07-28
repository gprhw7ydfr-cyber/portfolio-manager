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
  const cashFlowSeries = cashFlowUnit === "weekly"
    ? projection.cashFlowSeries.map((point, index) => ({
      ...point,
      // The first point can represent fewer than 52 weeks (a property bought partway through the
      // current calendar year) — dividing by a flat 52 would understate the real weekly rate.
      value: point.value / (index === 0 ? projection.firstYearWeeks : 52),
    }))
    : projection.cashFlowSeries;
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
          <ResultCard label="Total mortgage debt" value={formatMoney(stats.totalMortgageDebt)} supportingText="Only liability type today" />
          <ResultCard label="Total offset balance" value={formatMoney(stats.totalOffsetBalance)} />
          <ResultCard label="Total cash" value={formatMoney(stats.totalCash)} />
          <ResultCard label="Total equity" value={formatMoney(stats.totalEquity)} supportingText="Property value less mortgage debt" />
          <ResultCard label="Loan-to-value ratio" value={percent(stats.loanToValueRatio)} />
          <ResultCard label="Weekly cash flow" value={formatMoney(stats.weeklyCashFlow)} />
          <ResultCard label="Monthly cash flow" value={formatMoney(stats.monthlyCashFlow)} />
          <ResultCard label="Annual cash flow" value={formatMoney(stats.annualCashFlow)} />
          <ResultCard label="Total interest paid" value={formatMoney(stats.totalInterestPaid)} supportingText="To date" />
          <ResultCard label="Forecast interest remaining" value={formatMoney(stats.forecastInterestRemaining)} />
          <ResultCard label="Portfolio return" value={percent(stats.portfolioReturn)} supportingText="Gross rental yield" />
          <ResultCard label="Passive income" value={formatMoney(stats.passiveIncomeAnnual)} supportingText="Property income per year" />
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
          <div><p className="eyebrow">Mortgages</p><h2>Loan balance over time.</h2></div>
        </div>
        <TrendLineChart points={charts.loanBalanceSeries} color={categorical.blue} seriesLabel="Loan balance" />
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div><p className="eyebrow">Mortgages</p><h2>Interest paid over time.</h2></div>
        </div>
        <TrendLineChart points={charts.interestPaidSeries} color={categorical.orange} seriesLabel="Cumulative interest paid" />
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
