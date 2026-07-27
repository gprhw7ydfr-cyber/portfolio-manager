export interface AmortizationPayment {
  paymentNumber: number;

  paymentDate: Date;

  annualInterestRate: number;

  openingBalance: number;

  repayment: number;

  scheduledRepayment: number;

  extraPayment: number;

  interest: number;

  principal: number;

  closingBalance: number;

  /** Developer Mode diagnostics — the day-count interest formula's inputs for this payment.
   *  Undefined for synthetic combined-mortgage schedules, where a single per-payment rate/day-count
   *  no longer applies once multiple splits are summed together. */
  dailyRate?: number;

  daysInPeriod?: number;

  chargeableBalance?: number;
}
