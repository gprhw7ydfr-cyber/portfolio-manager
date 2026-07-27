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
