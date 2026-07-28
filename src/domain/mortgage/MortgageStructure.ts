import type { RepaymentFrequency } from "./MortgageInput";
import type { MortgageSplit } from "./MortgageSplit";

/** The mortgage-shaped fields the simulation engine and every mortgage UI component actually
 *  read — shared by `MortgageLiability` (attached to a property) and `MortgageScenario` (a saved,
 *  unattached draft). Neither needs an explicit `extends`: both already satisfy this structurally. */
export interface MortgageStructure {
  id: string;
  name: string;
  frequency: RepaymentFrequency;
  startDate: string;
  splits: MortgageSplit[];
}
