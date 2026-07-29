import type { Portfolio } from "../portfolio/Portfolio";
import type { RepaymentFrequency } from "../mortgage/MortgageInput";
import { isPropertyAsset } from "../property/PropertyAsset";
import { annualRentAfterVacancy } from "../property/calculatePropertyIncome";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";

export interface CashFlowRow {
  weekly: number;
  fortnightly: number;
  monthly: number;
  annually: number;
}

export interface CashFlowSummary {
  income: CashFlowRow;
  expenses: CashFlowRow;
  net: CashFlowRow;
}

export const PERIODS_PER_YEAR: Record<RepaymentFrequency, number> = {
  weekly: 52,
  fortnightly: 26,
  monthly: 12,
};

export function toRow(annualAmount: number): CashFlowRow {
  return {
    weekly: annualAmount / PERIODS_PER_YEAR.weekly,
    fortnightly: annualAmount / PERIODS_PER_YEAR.fortnightly,
    monthly: annualAmount / PERIODS_PER_YEAR.monthly,
    annually: annualAmount,
  };
}

/** Scoped to the property portfolio only — property income/expenses and mortgage repayments
 *  (via the real engine, not a manually-entered duplicate). Deliberately excludes anything not
 *  tied to a property (salary, personal expenses, outside investments) by design. */
export function calculateCashFlow(portfolio: Portfolio): CashFlowSummary {
  let incomeAnnual = 0;
  let expensesAnnual = 0;

  for (const asset of portfolio.assets) {
    if (!isPropertyAsset(asset)) continue;
    incomeAnnual += annualRentAfterVacancy(asset) + asset.income.otherIncomePerYear;
    const { expenses } = asset;
    expensesAnnual += expenses.ratesPerYear + expenses.insurancePerYear + expenses.maintenancePerYear
      + expenses.bodyCorporatePerYear + expenses.propertyManagementPerYear + expenses.utilitiesPerYear
      + expenses.otherExpensesPerYear;
  }

  for (const liability of portfolio.liabilities) {
    if (liability.type !== "mortgage") continue;
    const result = MortgageEngine.simulate(toMortgageInput(liability, portfolio.assets));
    expensesAnnual += result.repayment * PERIODS_PER_YEAR[liability.frequency];
  }

  return {
    income: toRow(incomeAnnual),
    expenses: toRow(expensesAnnual),
    net: toRow(incomeAnnual - expensesAnnual),
  };
}
