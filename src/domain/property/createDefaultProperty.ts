import type { PropertyAsset } from "./PropertyAsset";
import type { OwnershipStake } from "../shared/Ownership";

export const createDefaultProperty = (name: string, ownership: OwnershipStake[]): PropertyAsset => ({
  id: crypto.randomUUID(),
  type: "residential-property",
  name,
  address: "",
  purchasePrice: 0,
  purchaseDate: new Date().toISOString().slice(0, 10),
  currentValue: 0,
  ownership,
  income: {
    rentPerWeek: 0,
    otherIncomePerYear: 0,
  },
  expenses: {
    ratesPerYear: 0,
    insurancePerYear: 0,
    maintenancePerYear: 0,
    bodyCorporatePerYear: 0,
    propertyManagementPerYear: 0,
    utilitiesPerYear: 0,
    otherExpensesPerYear: 0,
  },
  capitalImprovements: [],
});
