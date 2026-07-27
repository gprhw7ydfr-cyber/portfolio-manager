import type { RecurringPaymentInterval } from "../mortgage/RecurringPayment";

export interface StrategyEventBase {
  id: string;
  /** Years from today the event takes effect (0 = this year). */
  year: number;
}

/** Adds a new property funded by a new single-split mortgage. Its property/mortgage/split ids
 *  are all derived from this event's own id, so later events in the same scenario can target them. */
export interface BuyPropertyEvent extends StrategyEventBase {
  type: "buy-property";
  propertyName: string;
  price: number;
  deposit: number;
  annualInterestRate: number;
  years: number;
  rentPerWeek: number;
}

export interface SellPropertyEvent extends StrategyEventBase {
  type: "sell-property";
  /** A real PropertyAsset.id, or a buy-property event's id from earlier in the same scenario. */
  propertyId: string;
  sellingCostsPercentage: number;
}

export interface RenovateEvent extends StrategyEventBase {
  type: "renovate";
  propertyId: string;
  cost: number;
  expectedValueIncrease: number;
}

export interface IncreaseRepaymentsEvent extends StrategyEventBase {
  type: "increase-repayments";
  /** A real MortgageSplit.id, or a buy-property event's derived split id from earlier in the same scenario. */
  splitId: string;
  amount: number;
  interval: RecurringPaymentInterval;
}

export interface RefinanceEvent extends StrategyEventBase {
  type: "refinance";
  splitId: string;
  annualInterestRate: number;
}

export type StrategyEvent =
  | BuyPropertyEvent
  | SellPropertyEvent
  | RenovateEvent
  | IncreaseRepaymentsEvent
  | RefinanceEvent;

/** Partial<StrategyEvent> would collapse to only the union's common keys (id/year/type) — this
 *  stays a union of each member's own Partial so type-specific field edits still type-check. */
export type StrategyEventChanges =
  | Partial<BuyPropertyEvent>
  | Partial<SellPropertyEvent>
  | Partial<RenovateEvent>
  | Partial<IncreaseRepaymentsEvent>
  | Partial<RefinanceEvent>;

/** The synthetic property id a buy-property event's purchase is tracked under. */
export const buyEventPropertyId = (event: BuyPropertyEvent): string => event.id;

/** The synthetic mortgage split id a buy-property event's loan is tracked under. */
export const buyEventSplitId = (event: BuyPropertyEvent): string => `${event.id}::split`;
