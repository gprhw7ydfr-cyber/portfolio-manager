export type RecurringPaymentInterval =
  | "weekly"
  | "monthly"
  | "semi-annually"
  | "annually"
  | "every-2-years"
  | "every-3-years"
  | "every-4-years"
  | "every-5-years";
export type RecurringPaymentKind = "extra" | "lump-sum";

export interface RecurringPayment {
  id: string;
  kind: RecurringPaymentKind;
  amount: number;
  interval: RecurringPaymentInterval;
  /** ISO calendar date. Payments begin on this date and repeat thereafter. */
  startDate: string;
  /** ISO calendar date, inclusive. Undefined means the payment repeats indefinitely. */
  endDate?: string;
}
