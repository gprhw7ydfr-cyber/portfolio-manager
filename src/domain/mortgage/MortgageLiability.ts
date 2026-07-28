import type { LiabilityBase } from "../liability/Liability";
import type { RepaymentFrequency } from "./MortgageInput";
import type { MortgageSplit } from "./MortgageSplit";

/** Groups the splits that belong to one real-world mortgage, closing the gap between the
 *  flat MortgageInput.splits list SimulationRunner operates on and the Vision's "unlimited
 *  mortgages, each with unlimited loan splits." */
export interface MortgageLiability extends LiabilityBase {
  type: "mortgage";
  lender?: string;
  /** The PropertyAsset this mortgage is secured against, if any. Optional: mortgages can exist unattached. */
  propertyId?: string;
  frequency: RepaymentFrequency;
  startDate: string;
  splits: MortgageSplit[];

  /** Traceability only, from the Mortgage Lab's "attach" step — a one-time copy, not a live link.
   *  Editing this liability afterward never updates the saved scenario/strategy, and vice versa.
   *  May point at a scenario/strategy that's since been deleted; lookups should degrade gracefully. */
  sourceScenarioId?: string;
  sourceStrategyId?: string;
}
