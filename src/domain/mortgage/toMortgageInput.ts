import type { MortgageInput } from "./MortgageInput";
import type { MortgageLiability } from "./MortgageLiability";

export function toMortgageInput(mortgage: MortgageLiability): MortgageInput {
  return {
    frequency: mortgage.frequency,
    startDate: new Date(`${mortgage.startDate}T00:00:00`),
    splits: mortgage.splits,
  };
}
