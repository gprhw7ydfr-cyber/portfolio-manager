import type { MortgageStructure } from "./MortgageStructure";
import type { Asset } from "../asset/Asset";
import { toMortgageInput } from "./toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { combineSchedules } from "./amortizationDetail";

export interface CombinedMortgageTotals {
  totalInterest: number;
  totalRepayment: number;
  payoffDate?: Date;
}

/** Exported so `compareMortgageStructures.ts` (Mortgage Lab) can reuse the exact same
 *  simulate-and-total logic instead of duplicating it. */
export function totalsFor<T extends MortgageStructure>(mortgage: T, assets: Asset[]): CombinedMortgageTotals {
  const result = MortgageEngine.simulate(toMortgageInput(mortgage, assets));
  const combined = combineSchedules(result.splits.map((split) => split.schedule));
  return {
    totalInterest: result.totalInterest,
    totalRepayment: result.totalRepayment,
    payoffDate: combined.at(-1)?.closingBalance === 0 ? combined.at(-1)?.paymentDate : undefined,
  };
}

/** Compares the whole mortgage's combined position (not just one split) between a baseline and a
 *  hypothetical version with extra-payment changes applied — "what does following this
 *  recommendation actually do to my overall loan?" reusing the same simulate + combineSchedules
 *  path as the amortization detail view, not a new calculation. */
export function compareCombinedMortgage<T extends MortgageStructure>(
  mortgage: T,
  testMortgage: T,
  assets: Asset[],
): { baseline: CombinedMortgageTotals; withChanges: CombinedMortgageTotals } {
  return {
    baseline: totalsFor(mortgage, assets),
    withChanges: totalsFor(testMortgage, assets),
  };
}
