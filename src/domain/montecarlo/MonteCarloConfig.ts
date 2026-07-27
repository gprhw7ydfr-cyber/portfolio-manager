export type MonteCarloRunCount = 100 | 500 | 1000;

export interface VolatilityAssumptions {
  mortgageRateStdDev: number;
  propertyGrowthStdDev: number;
  rentalGrowthStdDev: number;
  expenseInflationStdDev: number;
  vacancyRateStdDev: number;
}

export interface MonteCarloConfig {
  runs: MonteCarloRunCount;
  targetNetWorth: number;
  volatility: VolatilityAssumptions;
}

export const createDefaultMonteCarloConfig = (): MonteCarloConfig => ({
  runs: 500,
  targetNetWorth: 1000000,
  volatility: {
    mortgageRateStdDev: 1,
    propertyGrowthStdDev: 3,
    rentalGrowthStdDev: 1.5,
    expenseInflationStdDev: 1.5,
    vacancyRateStdDev: 2,
  },
});
