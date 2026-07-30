import type { Portfolio } from "../portfolio/Portfolio";
import type { ReportData, ReportSection } from "./ReportData";
import { calculateCashFlow, type CashFlowRow } from "../cashflow/calculateCashFlow";
import { calculateDashboardProjection } from "../dashboard/calculateDashboardProjection";
import { formatMoney } from "../shared/formatMoney";

const rowSection = (heading: string, row: CashFlowRow): ReportSection => ({
  heading,
  rows: [
    { label: "Weekly", value: formatMoney(row.weekly) },
    { label: "Fortnightly", value: formatMoney(row.fortnightly) },
    { label: "Monthly", value: formatMoney(row.monthly) },
    { label: "Annually", value: formatMoney(row.annually) },
  ],
});

export function buildCashFlowReport(portfolio: Portfolio, asOf: Date = new Date()): ReportData {
  const cashFlow = calculateCashFlow(portfolio);
  const projection = calculateDashboardProjection(portfolio, asOf);

  // The first point can represent fewer than 52 weeks (a property bought partway through the
  // current calendar year) — annualized to a full-year run-rate so it's comparable to every
  // other year, same treatment as the Dashboard's own "Projected cash flow" chart.
  const projectedCashFlow = projection.cashFlowSeries.map((point, index) => ({
    ...point,
    value: index === 0 ? (point.value / projection.firstYearWeeks) * 52 : point.value,
  }));

  return {
    title: "Cash Flow Report",
    generatedAt: asOf.toISOString(),
    sections: [
      rowSection("Income", cashFlow.income),
      rowSection("Expenses", cashFlow.expenses),
      {
        ...rowSection("Net", cashFlow.net),
        chart: {
          kind: "bar",
          values: [
            { label: "Income", value: cashFlow.income.monthly },
            { label: "Expenses", value: cashFlow.expenses.monthly },
            { label: "Net", value: cashFlow.net.monthly },
          ],
        },
      },
      {
        heading: "Projected annual cash flow",
        rows: projectedCashFlow.map((point) => ({ label: String(point.year), value: formatMoney(point.value) })),
        chart: {
          kind: "trend",
          seriesLabel: "Projected annual cash flow",
          series: [{ label: "Projected cash flow", points: projectedCashFlow }],
        },
      },
    ],
  };
}
