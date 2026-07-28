import type { MortgageStructure } from "./MortgageStructure";
import type { Asset } from "../asset/Asset";
import type { AmortizationPayment } from "./AmortizationPayment";
import type { CombinedMortgageTotals } from "./combinedMortgageComparison";
import { toMortgageInput } from "./toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { combineSchedules } from "./amortizationDetail";

export interface MortgageStructureComparisonEntry {
  label: string;
  totals: CombinedMortgageTotals;
  combinedSchedule: AmortizationPayment[];
}

/** N-way comparison of arbitrary mortgage structures (scenarios, strategy results, or
 *  currently-attached mortgages — anything satisfying MortgageStructure), reusing the same
 *  simulate + combineSchedules path as the single-mortgage comparison view. Used for both
 *  scenario-vs-scenario and strategy-vs-strategy-vs-scenario-baseline comparisons in the
 *  Mortgage Lab — same function, different candidate lists. */
export function compareMortgageStructures(
  candidates: { label: string; structure: MortgageStructure }[],
  assets: Asset[],
): MortgageStructureComparisonEntry[] {
  return candidates.map(({ label, structure }) => {
    const result = MortgageEngine.simulate(toMortgageInput(structure, assets));
    const combinedSchedule = combineSchedules(result.splits.map((split) => split.schedule));
    const last = combinedSchedule.at(-1);
    return {
      label,
      totals: {
        totalInterest: result.totalInterest,
        totalRepayment: result.totalRepayment,
        payoffDate: last?.closingBalance === 0 ? last.paymentDate : undefined,
      },
      combinedSchedule,
    };
  });
}
