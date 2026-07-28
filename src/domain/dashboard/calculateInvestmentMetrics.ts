import type { Portfolio } from "../portfolio/Portfolio";
import type { PropertyAsset } from "../property/PropertyAsset";
import { isPropertyAsset } from "../property/PropertyAsset";
import { annualRentAfterVacancy } from "../property/calculatePropertyIncome";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { PERIODS_PER_YEAR } from "../cashflow/calculateCashFlow";

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
const MIN_YEARS = 1 / 365;

export interface RoiFigures {
  totalPercent: number;
  annualizedPercent: number;
}

export interface InvestmentMetrics {
  cashInvested: number;
  /** 0 means no attached mortgage — UI should show "No mortgage attached" rather than a DSCR. */
  debtServiceAnnual: number;
  cashOnCashReturn: number;
  dscr: number;
  roiSincePurchase: RoiFigures & { yearsHeld: number };
  roiForwardProjection: RoiFigures;
}

export interface ForwardProjectionAssumptions {
  projectionYears: number;
  /** % p.a. applied to current value; cash flow is assumed to hold at today's run-rate. */
  assumedGrowthRate: number;
}

export const DEFAULT_PROJECTION_YEARS = 10;
export const DEFAULT_ASSUMED_GROWTH_RATE = 4;

/** Purchase price minus the attached mortgage's starting principal (a proxy for the deposit),
 *  plus capital improvements — the pre-filled default for PropertyAsset.cashInvested whenever
 *  the user hasn't set (or corrected) it themselves. */
export function estimateCashInvested(property: PropertyAsset, portfolio: Portfolio): number {
  let initialMortgagePrincipal = 0;
  for (const liability of portfolio.liabilities) {
    if (liability.type !== "mortgage" || liability.propertyId !== property.id) continue;
    for (const split of liability.splits) initialMortgagePrincipal += split.principal;
  }
  const capitalImprovementsCost = property.capitalImprovements.reduce((sum, item) => sum + item.cost, 0);
  return property.purchasePrice - initialMortgagePrincipal + capitalImprovementsCost;
}

/** Steady-state annual mortgage repayment (P&I) for whichever liabilities are attached to this
 *  property — the same per-liability figure calculateCashFlow.ts already relies on portfolio-wide. */
function propertyDebtServiceAnnual(property: PropertyAsset, portfolio: Portfolio): number {
  let total = 0;
  for (const liability of portfolio.liabilities) {
    if (liability.type !== "mortgage" || liability.propertyId !== property.id) continue;
    const result = MortgageEngine.simulate(toMortgageInput(liability, portfolio.assets));
    total += result.repayment * PERIODS_PER_YEAR[liability.frequency];
  }
  return total;
}

function propertyNoiAnnual(property: PropertyAsset): number {
  const incomeAnnual = annualRentAfterVacancy(property) + property.income.otherIncomePerYear;
  const { expenses } = property;
  const expensesAnnual = expenses.ratesPerYear + expenses.insurancePerYear + expenses.maintenancePerYear
    + expenses.bodyCorporatePerYear + expenses.propertyManagementPerYear + expenses.utilitiesPerYear
    + expenses.otherExpensesPerYear;
  return incomeAnnual - expensesAnnual;
}

/** (1 + totalPercent) ** (1 / years) - 1, guarded against a non-positive base (an total return of
 *  -100% or worse) producing NaN from a fractional power, and against a zero/negative period. */
function annualizeReturn(totalPercent: number, years: number): number {
  if (years <= 0) return 0;
  const base = 1 + totalPercent;
  if (base <= 0) return -1;
  return base ** (1 / years) - 1;
}

interface PropertyFigures {
  cashInvested: number;
  debtServiceAnnual: number;
  noiAnnual: number;
  annualCashFlow: number;
  yearsHeld: number;
  capitalGain: number;
}

function calculatePropertyFigures(property: PropertyAsset, portfolio: Portfolio, asOf: Date): PropertyFigures {
  const cashInvested = property.cashInvested ?? estimateCashInvested(property, portfolio);
  const debtServiceAnnual = propertyDebtServiceAnnual(property, portfolio);
  const noiAnnual = propertyNoiAnnual(property);
  const annualCashFlow = noiAnnual - debtServiceAnnual;
  const yearsHeld = Math.max(MIN_YEARS, (asOf.getTime() - new Date(property.purchaseDate).getTime()) / MS_PER_YEAR);
  const capitalGain = property.currentValue - property.purchasePrice;
  return { cashInvested, debtServiceAnnual, noiAnnual, annualCashFlow, yearsHeld, capitalGain };
}

function toMetrics(figures: PropertyFigures, currentValue: number, forward: ForwardProjectionAssumptions): InvestmentMetrics {
  const { cashInvested, debtServiceAnnual, noiAnnual, annualCashFlow, yearsHeld, capitalGain } = figures;

  const cashOnCashReturn = cashInvested > 0 ? annualCashFlow / cashInvested : 0;
  const dscr = debtServiceAnnual > 0 ? noiAnnual / debtServiceAnnual : 0;

  // Approximates cumulative cash flow since purchase as today's run-rate held constant across the
  // holding period — no historical cash-flow ledger exists to do better, same kind of approximation
  // calculateDashboardStats.ts's portfolioReturn already makes with current NOI.
  const cumulativeCashFlowSincePurchase = annualCashFlow * yearsHeld;
  const totalGainSincePurchase = capitalGain + cumulativeCashFlowSincePurchase;
  const totalPercentSincePurchase = cashInvested > 0 ? totalGainSincePurchase / cashInvested : 0;

  const projectedValue = currentValue * (1 + forward.assumedGrowthRate / 100) ** forward.projectionYears;
  const totalGainForward = (projectedValue - currentValue) + annualCashFlow * forward.projectionYears;
  const totalPercentForward = cashInvested > 0 ? totalGainForward / cashInvested : 0;

  return {
    cashInvested,
    debtServiceAnnual,
    cashOnCashReturn,
    dscr,
    roiSincePurchase: {
      totalPercent: totalPercentSincePurchase,
      annualizedPercent: annualizeReturn(totalPercentSincePurchase, yearsHeld),
      yearsHeld,
    },
    roiForwardProjection: {
      totalPercent: totalPercentForward,
      annualizedPercent: annualizeReturn(totalPercentForward, forward.projectionYears),
    },
  };
}

export function calculatePropertyInvestmentMetrics(
  property: PropertyAsset,
  portfolio: Portfolio,
  forward: ForwardProjectionAssumptions,
  asOf: Date = new Date(),
): InvestmentMetrics {
  const figures = calculatePropertyFigures(property, portfolio, asOf);
  return toMetrics(figures, property.currentValue, forward);
}

/** Aggregates every property dollar-for-dollar (sum of gains over sum of cash invested), and
 *  annualizes the since-purchase figure using a cash-invested-weighted average holding period —
 *  an approximation, not true money-weighted return (XIRR), but reasonable for a single-user tool
 *  and consistent with the rest of the app's documented-approximation style. The forward-projection
 *  figure needs no such weighting since every property shares the same projectionYears. */
export function calculatePortfolioInvestmentMetrics(
  portfolio: Portfolio,
  forward: ForwardProjectionAssumptions,
  asOf: Date = new Date(),
): InvestmentMetrics {
  const properties = portfolio.assets.filter(isPropertyAsset);

  let cashInvested = 0;
  let debtServiceAnnual = 0;
  let noiAnnual = 0;
  let annualCashFlow = 0;
  let totalGainSincePurchase = 0;
  let totalGainForward = 0;
  let weightedYearsNumerator = 0;

  for (const property of properties) {
    const figures = calculatePropertyFigures(property, portfolio, asOf);
    cashInvested += figures.cashInvested;
    debtServiceAnnual += figures.debtServiceAnnual;
    noiAnnual += figures.noiAnnual;
    annualCashFlow += figures.annualCashFlow;
    totalGainSincePurchase += figures.capitalGain + figures.annualCashFlow * figures.yearsHeld;
    weightedYearsNumerator += figures.cashInvested * figures.yearsHeld;

    const projectedValue = property.currentValue * (1 + forward.assumedGrowthRate / 100) ** forward.projectionYears;
    totalGainForward += (projectedValue - property.currentValue) + figures.annualCashFlow * forward.projectionYears;
  }

  const cashOnCashReturn = cashInvested > 0 ? annualCashFlow / cashInvested : 0;
  const dscr = debtServiceAnnual > 0 ? noiAnnual / debtServiceAnnual : 0;
  const totalPercentSincePurchase = cashInvested > 0 ? totalGainSincePurchase / cashInvested : 0;
  const weightedYearsHeld = cashInvested > 0 ? weightedYearsNumerator / cashInvested : 0;
  const totalPercentForward = cashInvested > 0 ? totalGainForward / cashInvested : 0;

  return {
    cashInvested,
    debtServiceAnnual,
    cashOnCashReturn,
    dscr,
    roiSincePurchase: {
      totalPercent: totalPercentSincePurchase,
      annualizedPercent: annualizeReturn(totalPercentSincePurchase, weightedYearsHeld),
      yearsHeld: weightedYearsHeld,
    },
    roiForwardProjection: {
      totalPercent: totalPercentForward,
      annualizedPercent: annualizeReturn(totalPercentForward, forward.projectionYears),
    },
  };
}
