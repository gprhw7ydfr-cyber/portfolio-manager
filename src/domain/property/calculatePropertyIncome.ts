import type { PropertyAsset } from "./PropertyAsset";

const WEEKS_PER_YEAR = 52;

/** Fraction of the year this property is actually occupied, given its own vacancy assumption —
 *  1 (fully occupied) if unset. Clamped to [0, 52] weeks so a stray input can't produce negative
 *  or over-100%-vacant income. */
export function occupancyFraction(property: PropertyAsset): number {
  const vacancyWeeks = Math.min(Math.max(property.income.vacancyWeeksPerYear ?? 0, 0), WEEKS_PER_YEAR);
  return (WEEKS_PER_YEAR - vacancyWeeks) / WEEKS_PER_YEAR;
}

/** Annual rental income after this property's own vacancy assumption — spread evenly across the
 *  year (a smoothed average, not a simulation of which specific weeks are vacant) so weekly/
 *  monthly/annual cash flow figures stay linear and consistent with each other. Excludes
 *  `otherIncomePerYear`, which isn't occupancy-dependent (parking, storage, etc). */
export function annualRentAfterVacancy(property: PropertyAsset): number {
  return property.income.rentPerWeek * WEEKS_PER_YEAR * occupancyFraction(property);
}

function annualExpenses(property: PropertyAsset): number {
  const { expenses } = property;
  return expenses.ratesPerYear + expenses.insurancePerYear + expenses.maintenancePerYear
    + expenses.bodyCorporatePerYear + expenses.propertyManagementPerYear + expenses.utilitiesPerYear
    + expenses.otherExpensesPerYear;
}

/** Annual net operating income — occupancy-adjusted rent plus other income, minus every expense
 *  line. Same NOI-based math as `calculateDashboardStats.ts`'s "Gross rental yield" figure. */
export function annualNetOperatingIncome(property: PropertyAsset): number {
  return annualRentAfterVacancy(property) + property.income.otherIncomePerYear - annualExpenses(property);
}

/** Net operating income ÷ current value — 0 when the property has no recorded value, so a
 *  freshly-added property shows 0% rather than Infinity/NaN. */
export function calculatePropertyYield(property: PropertyAsset): number {
  return property.currentValue > 0 ? annualNetOperatingIncome(property) / property.currentValue : 0;
}
