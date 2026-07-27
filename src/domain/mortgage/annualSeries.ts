import type { AmortizationPayment } from "./AmortizationPayment";

export interface YearPoint {
  year: number;
  closingBalance: number;
  cumulativeInterest: number;
}

/** One point per calendar year (the schedule's own last entry that year) — payment frequencies,
 *  start dates, and terms differ per split, so calendar years are the only grid they share. */
export function annualSeriesForSchedule(schedule: AmortizationPayment[]): YearPoint[] {
  const points: YearPoint[] = [];
  let cumulativeInterest = 0;

  for (const payment of schedule) {
    cumulativeInterest += payment.interest;
    const year = payment.paymentDate.getFullYear();
    const last = points.at(-1);
    if (last && last.year === year) {
      last.closingBalance = payment.closingBalance;
      last.cumulativeInterest = cumulativeInterest;
    } else {
      points.push({ year, closingBalance: payment.closingBalance, cumulativeInterest });
    }
  }

  return points;
}

export function valueAtYear(points: YearPoint[], year: number): YearPoint {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || year < first.year) return { year, closingBalance: 0, cumulativeInterest: 0 };
  if (year > last.year) return { year, closingBalance: last.closingBalance, cumulativeInterest: last.cumulativeInterest };
  return points.find((point) => point.year === year) ?? { year, closingBalance: last.closingBalance, cumulativeInterest: last.cumulativeInterest };
}
