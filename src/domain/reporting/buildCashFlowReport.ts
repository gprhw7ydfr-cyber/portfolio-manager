import type { Portfolio } from "../portfolio/Portfolio";
import type { ReportData, ReportSection } from "./ReportData";
import { calculateCashFlow, type CashFlowRow } from "../cashflow/calculateCashFlow";
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

  return {
    title: "Cash Flow Report",
    generatedAt: asOf.toISOString(),
    sections: [
      rowSection("Income", cashFlow.income),
      rowSection("Expenses", cashFlow.expenses),
      rowSection("Net", cashFlow.net),
    ],
  };
}
