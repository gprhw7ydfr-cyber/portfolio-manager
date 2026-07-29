import type { PropertyAsset } from "../property/PropertyAsset";
import type { MortgageLiability } from "../mortgage/MortgageLiability";
import type { CashAccount } from "../cash/CashAccount";
import type { CashFlowSummary } from "./calculateCashFlow";
import { PERIODS_PER_YEAR, toRow } from "./calculateCashFlow";
import { annualRentAfterVacancy } from "../property/calculatePropertyIncome";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";

/** Same shape and math as calculateCashFlow, scoped to a single property and its own attached
 *  mortgage (if any) rather than the whole portfolio — lets the property page show its own
 *  contribution to cash flow in isolation. */
export function calculatePropertyCashFlow(
  property: PropertyAsset,
  mortgage: MortgageLiability | undefined,
  cashAccounts: CashAccount[],
): CashFlowSummary {
  const incomeAnnual = annualRentAfterVacancy(property) + property.income.otherIncomePerYear;
  const { expenses } = property;
  let expensesAnnual = expenses.ratesPerYear + expenses.insurancePerYear + expenses.maintenancePerYear
    + expenses.bodyCorporatePerYear + expenses.propertyManagementPerYear + expenses.utilitiesPerYear
    + expenses.otherExpensesPerYear;

  if (mortgage) {
    const result = MortgageEngine.simulate(toMortgageInput(mortgage, cashAccounts));
    expensesAnnual += result.repayment * PERIODS_PER_YEAR[mortgage.frequency];
  }

  return {
    income: toRow(incomeAnnual),
    expenses: toRow(expensesAnnual),
    net: toRow(incomeAnnual - expensesAnnual),
  };
}
