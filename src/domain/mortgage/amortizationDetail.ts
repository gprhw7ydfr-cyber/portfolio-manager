import type { AmortizationPayment } from "./AmortizationPayment";

export interface AnnualAmortizationRow {
  year: number;
  openingBalance: number;
  interestPaid: number;
  principalPaid: number;
  closingBalance: number;
}

/** Every split in one mortgage shares the same frequency/start date, so schedules are
 *  index-aligned by paymentNumber and can be summed directly — a split that's already paid
 *  off simply stops contributing. This is what makes "the mortgage as a whole" possible
 *  without re-simulating anything. */
export function combineSchedules(schedules: AmortizationPayment[][]): AmortizationPayment[] {
  const maxLength = Math.max(0, ...schedules.map((schedule) => schedule.length));
  const combined: AmortizationPayment[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const activePayments = schedules.map((schedule) => schedule[index]).filter((payment): payment is AmortizationPayment => payment !== undefined);
    const paymentDate = activePayments[0]?.paymentDate ?? combined[index - 1]?.paymentDate;
    if (!paymentDate) continue;

    combined.push({
      paymentNumber: index + 1,
      paymentDate,
      annualInterestRate: 0,
      openingBalance: activePayments.reduce((sum, payment) => sum + payment.openingBalance, 0),
      repayment: activePayments.reduce((sum, payment) => sum + payment.repayment, 0),
      scheduledRepayment: activePayments.reduce((sum, payment) => sum + payment.scheduledRepayment, 0),
      extraPayment: activePayments.reduce((sum, payment) => sum + payment.extraPayment, 0),
      interest: activePayments.reduce((sum, payment) => sum + payment.interest, 0),
      principal: activePayments.reduce((sum, payment) => sum + payment.principal, 0),
      closingBalance: activePayments.reduce((sum, payment) => sum + payment.closingBalance, 0),
    });
  }

  return combined;
}

/** One row per calendar year. principalPaid is derived as openingBalance − closingBalance for
 *  the year, not summed from payment.principal — that field excludes extra payments and
 *  redistribution transfers, so the subtraction is correct regardless of why the balance moved. */
export function annualAmortizationSummary(schedule: AmortizationPayment[]): AnnualAmortizationRow[] {
  const rows: AnnualAmortizationRow[] = [];

  for (const payment of schedule) {
    const year = payment.paymentDate.getFullYear();
    const last = rows.at(-1);
    if (last && last.year === year) {
      last.closingBalance = payment.closingBalance;
      last.interestPaid += payment.interest;
    } else {
      rows.push({ year, openingBalance: payment.openingBalance, interestPaid: payment.interest, principalPaid: 0, closingBalance: payment.closingBalance });
    }
  }

  return rows.map((row) => ({ ...row, principalPaid: row.openingBalance - row.closingBalance }));
}
