import type { ExtraPaymentMode } from "./recommendExtraPayment";
import type { RateType, FixedRateSettings } from "./FixedRateSettings";
import type { RefixBalanceTarget } from "./RefixBalanceTarget";

/** One extra/recurring-payment target within a strategy — a split, an amount, and how often.
 *  A strategy can carry several of these (e.g. weekly on one split, a lump sum on another). */
export interface MortgageStrategyExtraPayment {
  id: string;
  splitId: string;
  amount: number;
  mode: ExtraPaymentMode;
}

/** A rate/refix override for one split. Fields merge onto the split individually — in
 *  particular `fixedRateSettings` is a nested partial merge, not a wholesale replace, so a
 *  strategy can override just `refixAnnualRate` without having to restate
 *  `fixedRateTermMonths`/`refixTermMonths`, which belong to the scenario, not the strategy. */
export interface MortgageStrategySplitOverride {
  annualInterestRate?: number;
  rateType?: RateType;
  refixBalanceTarget?: RefixBalanceTarget;
  fixedRateSettings?: Partial<FixedRateSettings>;
}

/** A named plan layered on top of one `MortgageScenario` (`scenarioId`) — rate/refix assumptions
 *  and/or extra payments only. Changing principal, term, product type, or offset/revolving-credit
 *  settings describes a different scenario, not a strategy on top of one. */
export interface MortgageStrategy {
  id: string;
  scenarioId: string;
  name: string;
  /** Keyed by split id. */
  splitOverrides?: Record<string, MortgageStrategySplitOverride>;
  extraPayments?: MortgageStrategyExtraPayment[];
}
