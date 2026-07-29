import type { AmortizationPayment } from "./AmortizationPayment";

/** Index of the first payment on/after `asOf` (a real wall-clock date, not the mortgage's
 *  simulation start date), or `schedule.length` if every payment is already in the past. */
export function findPaymentIndexAsOf(schedule: AmortizationPayment[], asOf: Date): number {
  const index = schedule.findIndex((payment) => payment.paymentDate >= asOf);
  return index === -1 ? schedule.length : index;
}

export function currentBalanceAsOf(schedule: AmortizationPayment[], asOf: Date): number {
  const index = findPaymentIndexAsOf(schedule, asOf);
  return schedule[index]?.openingBalance ?? 0;
}

export interface RemainingTotals {
  interest: number;
  repayment: number;
}

/** Sums interest and total repayment (principal + interest) across every payment from `asOf`
 *  onward — what's still left to pay from today, not the full lifetime total (which also
 *  includes payments already made) and not what's already been paid. Recalculates instantly
 *  whenever the underlying loan terms change, but only actually shrinks as `asOf` itself moves
 *  forward through the (otherwise fixed) schedule — i.e. as real time passes. */
export function remainingTotalsAsOf(schedule: AmortizationPayment[], asOf: Date): RemainingTotals {
  const index = findPaymentIndexAsOf(schedule, asOf);
  let interest = 0;
  let repayment = 0;
  for (let i = index; i < schedule.length; i += 1) {
    interest += schedule[i].interest;
    repayment += schedule[i].repayment;
  }
  return { interest, repayment };
}
