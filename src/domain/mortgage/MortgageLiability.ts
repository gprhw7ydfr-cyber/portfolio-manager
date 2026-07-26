import type { LiabilityBase } from "../liability/Liability";
import type { RepaymentFrequency } from "./MortgageInput";
import type { MortgageSplit } from "./MortgageSplit";

/** Groups the splits that belong to one real-world mortgage, closing the gap between the
 *  flat MortgageInput.splits list SimulationRunner operates on and the Vision's "unlimited
 *  mortgages, each with unlimited loan splits." */
export interface MortgageLiability extends LiabilityBase {
  type: "mortgage";
  lender?: string;
  frequency: RepaymentFrequency;
  startDate: string;
  splits: MortgageSplit[];
}
