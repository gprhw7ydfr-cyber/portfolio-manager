import type { CashAccount } from "./CashAccount";
import type { OwnershipStake } from "../shared/Ownership";

export const createDefaultCashAccount = (name: string, ownership: OwnershipStake[]): CashAccount => ({
  id: crypto.randomUUID(),
  type: "everyday",
  name,
  purchasePrice: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
  currentValue: 0,
  ownership,
});
