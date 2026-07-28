import type { Asset, AssetBase } from "../asset/Asset";

export type PropertyType = "residential-property" | "commercial-property" | "vacant-land";

export interface PropertyIncome {
  rentPerWeek: number;
  otherIncomePerYear: number;
}

export interface PropertyExpenses {
  ratesPerYear: number;
  insurancePerYear: number;
  maintenancePerYear: number;
  bodyCorporatePerYear: number;
  propertyManagementPerYear: number;
  utilitiesPerYear: number;
  otherExpensesPerYear: number;
}

export interface CapitalImprovement {
  id: string;
  description: string;
  cost: number;
  date: string;
  expectedValueIncrease?: number;
}

/** AssetBase.name doubles as the property's Nickname; Vision's "Address" is its own field. */
export interface PropertyAsset extends AssetBase {
  type: PropertyType;
  address: string;
  /** Council rating/capital value (used for rates) — distinct from currentValue and estimatedMarketValue. */
  capitalValue?: number;
  estimatedMarketValue?: number;
  floorArea?: number;
  landArea?: number;
  constructionYear?: number;
  income: PropertyIncome;
  expenses: PropertyExpenses;
  capitalImprovements: CapitalImprovement[];
  /** Cash actually put in — deposit + capital improvements funded from cash — used as the
   *  denominator for Cash-on-Cash Return and ROI. Pre-filled from an estimate (purchase price
   *  minus the attached mortgage's starting principal, plus capital improvements) whenever
   *  undefined, but always user-editable since that estimate can't see a later refinance or
   *  extra repayments made before this app was set up. */
  cashInvested?: number;
}

const PROPERTY_TYPES: PropertyType[] = ["residential-property", "commercial-property", "vacant-land"];

export function isPropertyAsset(asset: Asset): asset is PropertyAsset {
  return (PROPERTY_TYPES as string[]).includes(asset.type);
}
