import type { Portfolio } from "../portfolio/Portfolio";
import type { AssetType } from "../asset/Asset";
import { isPropertyAsset } from "../property/PropertyAsset";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { annualSeriesForSchedule, valueAtYear, type YearPoint } from "../mortgage/annualSeries";

export interface AllocationSlice {
  type: AssetType;
  label: string;
  value: number;
}

export interface NamedValue {
  label: string;
  value: number;
}

export interface AnnualPoint {
  year: number;
  value: number;
}

export interface DashboardCharts {
  assetAllocation: AllocationSlice[];
  propertyValues: NamedValue[];
  loanBalanceSeries: AnnualPoint[];
  interestPaidSeries: AnnualPoint[];
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  "residential-property": "Residential property",
  "commercial-property": "Commercial property",
  "vacant-land": "Vacant land",
  everyday: "Everyday",
  savings: "Savings",
  "term-deposit": "Term deposit",
  shares: "Shares",
  etf: "ETF",
  "managed-fund": "Managed fund",
  other: "Other",
};

export function calculateDashboardCharts(portfolio: Portfolio): DashboardCharts {
  const allocationTotals = new Map<AssetType, number>();
  for (const asset of portfolio.assets) {
    allocationTotals.set(asset.type, (allocationTotals.get(asset.type) ?? 0) + asset.currentValue);
  }
  const assetAllocation = [...allocationTotals.entries()].map(([type, value]) => ({
    type,
    label: ASSET_TYPE_LABELS[type],
    value,
  }));

  const propertyValues = portfolio.assets
    .filter(isPropertyAsset)
    .map((property) => ({ label: property.name, value: property.currentValue }));

  const scheduleSeries: YearPoint[][] = [];
  for (const liability of portfolio.liabilities) {
    if (liability.type !== "mortgage") continue;
    const result = MortgageEngine.simulate(toMortgageInput(liability, portfolio.assets));
    for (const splitResult of result.splits) {
      scheduleSeries.push(annualSeriesForSchedule(splitResult.schedule));
    }
  }

  const years = new Set<number>();
  for (const series of scheduleSeries) for (const point of series) years.add(point.year);
  const sortedYears = [...years].sort((a, b) => a - b);

  const loanBalanceSeries = sortedYears.map((year) => ({
    year,
    value: scheduleSeries.reduce((sum, series) => sum + valueAtYear(series, year).closingBalance, 0),
  }));
  const interestPaidSeries = sortedYears.map((year) => ({
    year,
    value: scheduleSeries.reduce((sum, series) => sum + valueAtYear(series, year).cumulativeInterest, 0),
  }));

  return { assetAllocation, propertyValues, loanBalanceSeries, interestPaidSeries };
}
