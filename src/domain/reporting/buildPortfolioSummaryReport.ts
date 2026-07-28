import type { Portfolio } from "../portfolio/Portfolio";
import type { ReportData } from "./ReportData";
import { calculateDashboardStats } from "../dashboard/calculateDashboardStats";
import { calculateDashboardCharts } from "../dashboard/calculateDashboardCharts";
import { formatMoney } from "../shared/formatMoney";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function buildPortfolioSummaryReport(portfolio: Portfolio, asOf: Date = new Date()): ReportData {
  const stats = calculateDashboardStats(portfolio, asOf);
  const charts = calculateDashboardCharts(portfolio);

  return {
    title: "Portfolio Summary",
    generatedAt: asOf.toISOString(),
    sections: [
      {
        heading: "Position",
        rows: [
          { label: "Net worth", value: formatMoney(stats.netWorth) },
          { label: "Total assets", value: formatMoney(stats.totalAssets) },
          { label: "Total liabilities", value: formatMoney(stats.totalLiabilities) },
          { label: "Total mortgage debt", value: formatMoney(stats.totalMortgageDebt) },
          { label: "Total offset balance", value: formatMoney(stats.totalOffsetBalance) },
          { label: "Total cash", value: formatMoney(stats.totalCash) },
          { label: "Total equity", value: formatMoney(stats.totalEquity) },
          { label: "Loan-to-value ratio", value: percent(stats.loanToValueRatio) },
        ],
        chart: charts.assetAllocation.length > 0 ? { kind: "allocation", slices: charts.assetAllocation } : undefined,
      },
      {
        heading: "Cash flow",
        rows: [
          { label: "Weekly cash flow", value: formatMoney(stats.weeklyCashFlow) },
          { label: "Monthly cash flow", value: formatMoney(stats.monthlyCashFlow) },
          { label: "Annual cash flow", value: formatMoney(stats.annualCashFlow) },
          { label: "Passive income (annual)", value: formatMoney(stats.passiveIncomeAnnual) },
        ],
      },
      {
        heading: "Interest",
        rows: [
          { label: "Total interest paid to date", value: formatMoney(stats.totalInterestPaid) },
          { label: "Forecast interest remaining", value: formatMoney(stats.forecastInterestRemaining) },
          { label: "Portfolio return (gross rental yield)", value: percent(stats.portfolioReturn) },
        ],
        chart: charts.loanBalanceSeries.length > 0 ? {
          kind: "trend",
          seriesLabel: "Mortgage",
          series: [
            { label: "Loan balance", points: charts.loanBalanceSeries },
            { label: "Interest paid", points: charts.interestPaidSeries },
          ],
        } : undefined,
      },
    ],
  };
}
