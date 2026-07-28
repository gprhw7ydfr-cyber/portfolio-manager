import type { Portfolio } from "../portfolio/Portfolio";
import { createBaselineScenario } from "../scenario/createDefaultScenario";
import { projectPortfolio } from "../scenario/projectPortfolio";
import type { ScenarioAssumptions } from "../scenario/Scenario";
import type { AnnualPoint } from "./calculateDashboardCharts";

const PROJECTION_YEARS = 10;

export interface DashboardProjection {
  netWorthSeries: AnnualPoint[];
  cashFlowSeries: AnnualPoint[];
  /** Weeks the first cash-flow point actually represents — 52 in the common case, less only when
   *  a property was purchased partway through the current calendar year. Lets the Dashboard's
   *  weekly toggle divide that one point honestly instead of by a flat 52. */
  firstYearWeeks: number;
  /** The growth/inflation assumptions used for this projection, so the Dashboard can show the
   *  reader what's actually being assumed rather than a vague "default growth assumptions" note. */
  assumptions: ScenarioAssumptions;
}

/** Forward-looking Dashboard charts — current holdings, default growth assumptions, no
 *  strategy events. Reuses the Strategy Simulator's own baseline projection rather than
 *  duplicating projection math here. */
export function calculateDashboardProjection(portfolio: Portfolio, asOf: Date = new Date()): DashboardProjection {
  const scenario = createBaselineScenario(PROJECTION_YEARS);
  const years = projectPortfolio(portfolio, scenario, asOf);
  return {
    netWorthSeries: years.map((year) => ({ year: year.year, value: year.netWorth })),
    cashFlowSeries: years.map((year) => ({ year: year.year, value: year.annualCashFlow })),
    firstYearWeeks: years[0]?.weeksInYear ?? 52,
    assumptions: scenario.assumptions,
  };
}
