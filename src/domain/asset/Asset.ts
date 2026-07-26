import type { OwnershipStake } from "../shared/Ownership";
import type { PropertyAsset } from "../property/PropertyAsset";
import type { CashAccount } from "../cash/CashAccount";

export type AssetType =
  | "residential-property"
  | "commercial-property"
  | "vacant-land"
  | "everyday"
  | "savings"
  | "term-deposit"
  | "shares"
  | "etf"
  | "managed-fund"
  | "other";

export interface AssetBase {
  id: string;
  name: string;
  purchasePrice: number;
  purchaseDate: string;
  currentValue: number;
  annualGrowthRate?: number;
  notes?: string;
  ownership: OwnershipStake[];
}

export interface OtherAsset extends AssetBase {
  type: "other";
}

// Shares/ETFs/managed funds etc. join this union as their own modules design them (Phase 4+).
export type Asset = OtherAsset | PropertyAsset | CashAccount;
