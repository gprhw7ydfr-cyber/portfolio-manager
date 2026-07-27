import type { StrategyEvent } from "./StrategyEvent";

export interface ScenarioAssumptions {
  projectionYears: number;
  /** Annual %, used for any property without its own AssetBase.annualGrowthRate. */
  propertyGrowthRate: number;
  rentalGrowthRate: number;
  expenseInflationRate: number;
  /** Flat annual % applied to every mortgage split for the whole projection, overriding
   *  each split's own rate and fixed-rate schedule — a simplification, not a refix simulator. */
  mortgageRateOverride?: number;
}

export interface Scenario {
  id: string;
  name: string;
  assumptions: ScenarioAssumptions;
  events: StrategyEvent[];
}
