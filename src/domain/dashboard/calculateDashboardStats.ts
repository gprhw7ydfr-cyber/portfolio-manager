import type { Portfolio } from "../portfolio/Portfolio";
import type { AmortizationPayment } from "../mortgage/AmortizationPayment";
import { isPropertyAsset } from "../property/PropertyAsset";
import { isCashAccount } from "../cash/CashAccount";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { calculateCashFlow, PERIODS_PER_YEAR } from "../cashflow/calculateCashFlow";

export interface DashboardStats {
  netWorth: number;
  totalAssets: number;
  /** Equal to totalMortgageDebt today — the Liability union only has MortgageLiability so far. */
  totalLiabilities: number;
  totalMortgageDebt: number;
  totalOffsetBalance: number;
  totalCash: number;
  totalEquity: number;
  loanToValueRatio: number;
  weeklyCashFlow: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  totalInterestPaid: number;
  forecastInterestRemaining: number;
  /** Gross rental yield: annualised property net operating income / total property value. */
  portfolioReturn: number;
  passiveIncomeAnnual: number;
}

function currentBalance(schedule: AmortizationPayment[], asOf: Date): number {
  const upcoming = schedule.find((payment) => payment.paymentDate >= asOf);
  return upcoming ? upcoming.openingBalance : 0;
}

function splitInterestPaidAndRemaining(schedule: AmortizationPayment[], asOf: Date): { paid: number; remaining: number } {
  let paid = 0;
  let remaining = 0;
  for (const payment of schedule) {
    if (payment.paymentDate < asOf) paid += payment.interest;
    else remaining += payment.interest;
  }
  return { paid, remaining };
}

/** "Today" is the real wall-clock date, not a mortgage's simulation start date — used to split
 *  each split's amortisation schedule into what's already happened vs. what's still ahead. */
export function calculateDashboardStats(portfolio: Portfolio, asOf: Date = new Date()): DashboardStats {
  const properties = portfolio.assets.filter(isPropertyAsset);
  const cashAccounts = portfolio.assets.filter(isCashAccount);

  const totalAssets = portfolio.assets.reduce((sum, asset) => sum + asset.currentValue, 0);
  const totalCash = cashAccounts.reduce((sum, account) => sum + account.currentValue, 0);
  const totalPropertyValue = properties.reduce((sum, property) => sum + property.currentValue, 0);

  let totalMortgageDebt = 0;
  let totalInterestPaid = 0;
  let forecastInterestRemaining = 0;
  const linkedOffsetAccountIds = new Set<string>();

  for (const liability of portfolio.liabilities) {
    if (liability.type !== "mortgage") continue;

    const result = MortgageEngine.simulate(toMortgageInput(liability, portfolio.assets));
    for (const splitResult of result.splits) {
      totalMortgageDebt += currentBalance(splitResult.schedule, asOf);
      const { paid, remaining } = splitInterestPaidAndRemaining(splitResult.schedule, asOf);
      totalInterestPaid += paid;
      forecastInterestRemaining += remaining;
    }

    for (const split of liability.splits) {
      const linkedAccountId = split.offsetSettings?.linkedAccountId;
      if (linkedAccountId) linkedOffsetAccountIds.add(linkedAccountId);
    }
  }

  const totalOffsetBalance = [...linkedOffsetAccountIds].reduce((sum, id) => {
    const account = portfolio.assets.find((asset) => asset.id === id);
    return sum + (account?.currentValue ?? 0);
  }, 0);

  const totalLiabilities = totalMortgageDebt;
  const netWorth = totalAssets - totalLiabilities;
  const totalEquity = totalPropertyValue - totalMortgageDebt;
  const loanToValueRatio = totalPropertyValue > 0 ? totalMortgageDebt / totalPropertyValue : 0;

  const cashFlow = calculateCashFlow(portfolio);

  let propertyIncomeAnnual = 0;
  let propertyNetOperatingIncomeAnnual = 0;
  for (const property of properties) {
    const incomeAnnual = property.income.rentPerWeek * PERIODS_PER_YEAR.weekly + property.income.otherIncomePerYear;
    const { expenses } = property;
    const expensesAnnual = expenses.ratesPerYear + expenses.insurancePerYear + expenses.maintenancePerYear
      + expenses.bodyCorporatePerYear + expenses.propertyManagementPerYear + expenses.utilitiesPerYear
      + expenses.otherExpensesPerYear;
    propertyIncomeAnnual += incomeAnnual;
    propertyNetOperatingIncomeAnnual += incomeAnnual - expensesAnnual;
  }
  const portfolioReturn = totalPropertyValue > 0 ? propertyNetOperatingIncomeAnnual / totalPropertyValue : 0;

  const nonSalaryIncomeAnnual = portfolio.cashFlowItems
    .filter((item) => item.kind === "income" && item.category !== "salary")
    .reduce((sum, item) => sum + item.amount * PERIODS_PER_YEAR[item.frequency], 0);
  const passiveIncomeAnnual = propertyIncomeAnnual + nonSalaryIncomeAnnual;

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    totalMortgageDebt,
    totalOffsetBalance,
    totalCash,
    totalEquity,
    loanToValueRatio,
    weeklyCashFlow: cashFlow.net.weekly,
    monthlyCashFlow: cashFlow.net.monthly,
    annualCashFlow: cashFlow.net.annually,
    totalInterestPaid,
    forecastInterestRemaining,
    portfolioReturn,
    passiveIncomeAnnual,
  };
}
