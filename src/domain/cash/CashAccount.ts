import type { Asset, AssetBase } from "../asset/Asset";

export type CashAccountType = "everyday" | "savings" | "term-deposit";

/** AssetBase.currentValue doubles as the account balance. */
export interface CashAccount extends AssetBase {
  type: CashAccountType;
  interestRate?: number;
  maturityDate?: string;
}

const CASH_ACCOUNT_TYPES: CashAccountType[] = ["everyday", "savings", "term-deposit"];

export function isCashAccount(asset: Asset): asset is CashAccount {
  return (CASH_ACCOUNT_TYPES as string[]).includes(asset.type);
}
