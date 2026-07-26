import type { OwnershipStake } from "../shared/Ownership";
import type { MortgageLiability } from "../mortgage/MortgageLiability";

export interface LiabilityBase {
  id: string;
  name: string;
  ownership: OwnershipStake[];
}

// Grows as other liability kinds (credit cards, personal loans, etc.) are added.
export type Liability = MortgageLiability;
