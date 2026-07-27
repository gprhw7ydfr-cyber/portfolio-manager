import type { Scenario } from "./Scenario";

export const createDefaultScenario = (name: string): Scenario => ({
  id: crypto.randomUUID(),
  name,
  assumptions: {
    projectionYears: 10,
    propertyGrowthRate: 4,
    rentalGrowthRate: 3,
    expenseInflationRate: 2.5,
  },
  events: [],
});

/** Default assumptions, no events — "do nothing" comparison baseline for a scenario's own projection length. */
export const createBaselineScenario = (projectionYears: number): Scenario => ({
  ...createDefaultScenario("Baseline"),
  assumptions: {
    projectionYears,
    propertyGrowthRate: 4,
    rentalGrowthRate: 3,
    expenseInflationRate: 2.5,
  },
});
