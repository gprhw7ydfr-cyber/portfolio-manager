import type { RecurringPaymentInterval } from "./RecurringPayment";

export type MortgageProductType = "principal-and-interest" | "offset" | "revolving-credit";

export interface OffsetSettings {
  offsetBalance: number;
  maintainLoanBalanceAtRefix?: boolean;
  refixLoanBalanceTarget?: number;
}

export interface RevolvingCreditTransaction {
  id: string;
  type: "deposit" | "withdrawal";
  amount: number;
  interval: Extract<RecurringPaymentInterval, "weekly" | "monthly">;
  startDate: string;
}

export interface RevolvingCreditSettings {
  creditLimit: number;
  transactions?: RevolvingCreditTransaction[];
}
