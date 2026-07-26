export type CashFlowKind = "income" | "expense";

export type CashFlowFrequency = "weekly" | "fortnightly" | "monthly" | "annually";

export type IncomeCategory = "salary" | "dividends" | "interest" | "other";

export type ExpenseCategory = "insurance" | "living-costs" | "maintenance" | "tax" | "other";

export interface CashFlowItem {
  id: string;
  name: string;
  kind: CashFlowKind;
  category: IncomeCategory | ExpenseCategory;
  amount: number;
  frequency: CashFlowFrequency;
}
