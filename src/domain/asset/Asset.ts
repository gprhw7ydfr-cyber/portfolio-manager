import type { OwnershipStake } from "../shared/Ownership";

export type AssetType =
  | "residential-property"
  | "commercial-property"
  | "vacant-land"
  | "cash"
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

// Property/Cash/Shares/etc. join this union as their own modules design them (Phase 2/3).
export type Asset = OtherAsset;
