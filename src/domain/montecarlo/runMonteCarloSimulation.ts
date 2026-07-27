import type { Portfolio } from "../portfolio/Portfolio";
import type { Scenario } from "../scenario/Scenario";
import { projectPortfolio, type ProjectionYear } from "../scenario/projectPortfolio";
import type { MonteCarloConfig } from "./MonteCarloConfig";
import { sampleNormal } from "./randomSampling";

export interface NetWorthPercentiles {
  year: number;
  p10: number;
  median: number;
  p90: number;
}

export interface MonteCarloResult {
  runs: number;
  probabilityOfSuccess: number;
  bestCase: number;
  worstCase: number;
  median: number;
  standardDeviation: number;
  p10: number;
  p90: number;
  netWorthByYear: NetWorthPercentiles[];
}

function percentile(sortedValues: number[], fraction: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (sortedValues.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function randomizeAssumptions(scenario: Scenario, config: MonteCarloConfig): Scenario {
  const { assumptions } = scenario;
  const { volatility } = config;

  return {
    ...scenario,
    assumptions: {
      ...assumptions,
      propertyGrowthRate: sampleNormal(assumptions.propertyGrowthRate, volatility.propertyGrowthStdDev, -20),
      rentalGrowthRate: sampleNormal(assumptions.rentalGrowthRate, volatility.rentalGrowthStdDev, -20),
      expenseInflationRate: sampleNormal(assumptions.expenseInflationRate, volatility.expenseInflationStdDev, -20),
      vacancyRate: sampleNormal(assumptions.vacancyRate ?? 0, volatility.vacancyRateStdDev, 0, 100),
      mortgageRateOverride: assumptions.mortgageRateOverride !== undefined
        ? sampleNormal(assumptions.mortgageRateOverride, volatility.mortgageRateStdDev, 0)
        : undefined,
    },
  };
}

/** Runs the unchanged Phase 5 `projectPortfolio` many times against randomised copies of the
 *  scenario's assumptions — strategy events stay fixed every run, only the continuous growth/
 *  rate/vacancy variables vary. Each run draws one value per variable and holds it for the whole
 *  projection (not re-randomised year to year) — a simplification, not a full stochastic walk. */
export function runMonteCarloSimulation(
  portfolio: Portfolio,
  scenario: Scenario,
  config: MonteCarloConfig,
  asOf: Date = new Date(),
): MonteCarloResult {
  const trajectories: ProjectionYear[][] = [];
  for (let run = 0; run < config.runs; run += 1) {
    trajectories.push(projectPortfolio(portfolio, randomizeAssumptions(scenario, config), asOf));
  }

  const finalNetWorths = trajectories.map((trajectory) => trajectory.at(-1)?.netWorth ?? 0).sort((a, b) => a - b);
  const mean = finalNetWorths.reduce((sum, value) => sum + value, 0) / finalNetWorths.length;
  const variance = finalNetWorths.reduce((sum, value) => sum + (value - mean) ** 2, 0) / finalNetWorths.length;

  const years = trajectories[0] ?? [];
  const netWorthByYear: NetWorthPercentiles[] = years.map((point, index) => {
    const valuesAtYear = trajectories.map((trajectory) => trajectory[index].netWorth).sort((a, b) => a - b);
    return {
      year: point.year,
      p10: percentile(valuesAtYear, 0.1),
      median: percentile(valuesAtYear, 0.5),
      p90: percentile(valuesAtYear, 0.9),
    };
  });

  return {
    runs: config.runs,
    probabilityOfSuccess: finalNetWorths.filter((value) => value >= config.targetNetWorth).length / finalNetWorths.length,
    bestCase: finalNetWorths.at(-1) ?? 0,
    worstCase: finalNetWorths[0] ?? 0,
    median: percentile(finalNetWorths, 0.5),
    standardDeviation: Math.sqrt(variance),
    p10: percentile(finalNetWorths, 0.1),
    p90: percentile(finalNetWorths, 0.9),
    netWorthByYear,
  };
}
