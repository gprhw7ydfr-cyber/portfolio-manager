import type { RepaymentFrequency } from "./MortgageInput";
import type { MortgageSplit } from "./MortgageSplit";

/** A saved, unattached mortgage structure draft — comparable against other scenarios and
 *  strategies via the same engine `MortgageLiability` uses, without belonging to any property
 *  until explicitly attached. Structurally satisfies `MortgageStructure`. */
export interface MortgageScenario {
  id: string;
  name: string;
  notes?: string;
  frequency: RepaymentFrequency;
  startDate: string;
  splits: MortgageSplit[];
}
