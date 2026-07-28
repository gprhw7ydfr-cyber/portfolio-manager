import type { StrategyEvent } from "./StrategyEvent";

export interface ScenarioAssumptions {
  projectionYears: number;
  /** Annual %, used for any property without its own AssetBase.annualGrowthRate. */
  propertyGrowthRate: number;
  rentalGrowthRate: number;
  expenseInflationRate: number;
  /** % of annual rent lost to vacancy, applied uniformly across every property. Undefined = 0. */
  vacancyRate?: number;
  /** Flat annual % applied to every mortgage split for the whole projection, overriding
   *  each split's own rate and fixed-rate schedule — a simplification, not a refix simulator. */
  mortgageRateOverride?: number;
  /** Forecast mortgage debt using this saved Mortgage Lab scenario's structure instead of the
   *  portfolio's real attached mortgage(s) — replaces the portfolio's entire real mortgage debt
   *  for this projection, not a per-property merge. Undefined = the real portfolio, as before. */
  mortgageScenarioId?: string;
}

export interface Scenario {
  id: string;
  name: string;
  assumptions: ScenarioAssumptions;
  events: StrategyEvent[];
}
