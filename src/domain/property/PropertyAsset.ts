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
  estimatedMarketValue?: number;
  floorArea?: number;
  landArea?: number;
  constructionYear?: number;
  income: PropertyIncome;
  expenses: PropertyExpenses;
  capitalImprovements: CapitalImprovement[];
}

const PROPERTY_TYPES: PropertyType[] = ["residential-property", "commercial-property", "vacant-land"];

export function isPropertyAsset(asset: Asset): asset is PropertyAsset {
  return (PROPERTY_TYPES as string[]).includes(asset.type);
}
