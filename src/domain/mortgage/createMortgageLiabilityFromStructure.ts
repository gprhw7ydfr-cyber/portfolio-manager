import type { MortgageStructure } from "./MortgageStructure";
import type { MortgageLiability } from "./MortgageLiability";
import type { OwnershipStake } from "../shared/Ownership";

export interface CreateMortgageLiabilityOptions {
  name?: string;
  lender?: string;
  sourceScenarioId?: string;
  sourceStrategyId?: string;
}

/** Materialises a `MortgageStructure` (a `MortgageLiability` itself, or a saved Mortgage Lab
 *  scenario/strategy result) into a brand-new, independent `MortgageLiability` attached to
 *  `propertyId` — a copy, not a live link back to whatever produced `structure`. */
export function createMortgageLiabilityFromStructure(
  structure: MortgageStructure,
  ownership: OwnershipStake[],
  propertyId: string,
  options?: CreateMortgageLiabilityOptions,
): MortgageLiability {
  return {
    id: crypto.randomUUID(),
    type: "mortgage",
    name: options?.name ?? structure.name,
    lender: options?.lender,
    ownership,
    propertyId,
    frequency: structure.frequency,
    startDate: structure.startDate,
    splits: structure.splits,
    sourceScenarioId: options?.sourceScenarioId,
    sourceStrategyId: options?.sourceStrategyId,
  };
}
