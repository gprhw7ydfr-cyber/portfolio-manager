import type { MortgageLiability } from "../mortgage/MortgageLiability";
import type { Asset } from "../asset/Asset";
import type { ReportData, ReportSection, ReportChart } from "./ReportData";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { combineSchedules } from "../mortgage/amortizationDetail";
import { annualSeriesForSchedule } from "../mortgage/annualSeries";
import { formatMoney } from "../shared/formatMoney";

const formatDate = (date: Date | undefined) => date ? date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function buildMortgageReport(liability: MortgageLiability, assets: Asset[] = [], asOf: Date = new Date()): ReportData {
  const summary = MortgageEngine.simulate(toMortgageInput(liability, assets));

  const splitSections: ReportSection[] = liability.splits.map((split, index) => {
    const result = summary.splits[index];
    return {
      heading: split.name,
      rows: [
        { label: "Loan amount", value: formatMoney(split.principal) },
        { label: "Interest rate", value: `${split.annualInterestRate}% p.a.` },
        { label: "Product", value: split.productType === "offset" ? "Offset mortgage" : split.productType === "revolving-credit" ? "Revolving credit" : "Principal & interest" },
        { label: "Term", value: `${split.years} years` },
        { label: "Regular repayment", value: formatMoney(result.repayment) },
        { label: "Total interest", value: formatMoney(result.totalInterest) },
        { label: split.productType === "revolving-credit" ? "Forecast balance" : "Estimated payoff", value: split.productType === "revolving-credit" ? formatMoney(result.schedule.at(-1)?.closingBalance ?? split.principal) : formatDate(result.schedule.at(-1)?.paymentDate) },
      ],
    };
  });

  const combinedSchedule = combineSchedules(summary.splits.map((split) => split.schedule));
  const annualSeries = annualSeriesForSchedule(combinedSchedule);
  const chart: ReportChart | undefined = annualSeries.length > 0 ? {
    kind: "trend",
    seriesLabel: "Mortgage",
    series: [
      { label: "Loan balance", points: annualSeries.map((point) => ({ year: point.year, value: point.closingBalance })) },
      { label: "Cumulative interest", points: annualSeries.map((point) => ({ year: point.year, value: point.cumulativeInterest })) },
    ],
  } : undefined;

  return {
    title: `Mortgage Report — ${liability.name}`,
    generatedAt: asOf.toISOString(),
    sections: [
      {
        heading: "Summary",
        rows: [
          { label: "Lender", value: liability.lender ?? "—" },
          { label: "Repayment frequency", value: liability.frequency },
          { label: "Total regular repayment", value: formatMoney(summary.repayment) },
          { label: "Total interest (all splits)", value: formatMoney(summary.totalInterest) },
          { label: "Loan completion date", value: formatDate(summary.payoffDate) },
        ],
        chart,
      },
      ...splitSections,
    ],
  };
}
