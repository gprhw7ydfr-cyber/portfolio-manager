import type { PropertyAsset, PropertyType } from "../property/PropertyAsset";
import type { MortgageLiability } from "../mortgage/MortgageLiability";
import type { Asset } from "../asset/Asset";
import type { ReportData, ReportSection } from "./ReportData";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { combineSchedules } from "../mortgage/amortizationDetail";
import { annualSeriesForSchedule } from "../mortgage/annualSeries";
import { formatMoney } from "../shared/formatMoney";

const typeLabel: Record<PropertyType, string> = {
  "residential-property": "Residential property",
  "commercial-property": "Commercial property",
  "vacant-land": "Vacant land",
};

export function buildPropertyReport(
  property: PropertyAsset,
  attachedMortgage: MortgageLiability | undefined,
  assets: Asset[] = [],
  asOf: Date = new Date(),
): ReportData {
  const sections: ReportSection[] = [
    {
      heading: "General",
      rows: [
        { label: "Address", value: property.address || "—" },
        { label: "Property type", value: typeLabel[property.type] },
        { label: "Purchase date", value: property.purchaseDate },
        { label: "Purchase price", value: formatMoney(property.purchasePrice) },
        { label: "Current value", value: formatMoney(property.currentValue) },
        { label: "Capital value", value: formatMoney(property.capitalValue ?? 0) },
        { label: "Estimated market value", value: formatMoney(property.estimatedMarketValue ?? 0) },
        { label: "Floor area", value: property.floorArea ? `${property.floorArea} m²` : "—" },
        { label: "Land area", value: property.landArea ? `${property.landArea} m²` : "—" },
        { label: "Construction year", value: property.constructionYear ? String(property.constructionYear) : "—" },
      ],
    },
    {
      heading: "Income",
      rows: [
        { label: "Rent", value: `${formatMoney(property.income.rentPerWeek)}/week` },
        { label: "Other income", value: `${formatMoney(property.income.otherIncomePerYear)}/year` },
      ],
    },
    {
      heading: "Expenses",
      rows: [
        { label: "Rates", value: `${formatMoney(property.expenses.ratesPerYear)}/year` },
        { label: "Insurance", value: `${formatMoney(property.expenses.insurancePerYear)}/year` },
        { label: "Maintenance", value: `${formatMoney(property.expenses.maintenancePerYear)}/year` },
        { label: "Body corporate", value: `${formatMoney(property.expenses.bodyCorporatePerYear)}/year` },
        { label: "Property management", value: `${formatMoney(property.expenses.propertyManagementPerYear)}/year` },
        { label: "Utilities", value: `${formatMoney(property.expenses.utilitiesPerYear)}/year` },
        { label: "Other expenses", value: `${formatMoney(property.expenses.otherExpensesPerYear)}/year` },
      ],
    },
  ];

  if (property.capitalImprovements.length > 0) {
    sections.push({
      heading: "Capital improvements",
      rows: property.capitalImprovements.map((improvement) => ({
        label: improvement.description || improvement.date,
        value: formatMoney(improvement.cost),
      })),
    });
  }

  if (attachedMortgage) {
    const summary = MortgageEngine.simulate(toMortgageInput(attachedMortgage, assets));
    const combinedSchedule = combineSchedules(summary.splits.map((split) => split.schedule));
    const annualSeries = annualSeriesForSchedule(combinedSchedule);
    sections.push({
      heading: "Mortgage",
      rows: [
        { label: "Name", value: attachedMortgage.name },
        { label: "Regular repayment", value: formatMoney(summary.repayment) },
        { label: "Total interest", value: formatMoney(summary.totalInterest) },
      ],
      chart: annualSeries.length > 0 ? {
        kind: "trend",
        seriesLabel: "Mortgage",
        series: [
          { label: "Loan balance", points: annualSeries.map((point) => ({ year: point.year, value: point.closingBalance })) },
          { label: "Cumulative interest", points: annualSeries.map((point) => ({ year: point.year, value: point.cumulativeInterest })) },
        ],
      } : undefined,
    });
  }

  return {
    title: `Property Report — ${property.name}`,
    generatedAt: asOf.toISOString(),
    sections,
  };
}
