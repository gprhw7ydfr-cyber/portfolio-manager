import type { MortgageLiability } from "./MortgageLiability";
import type { Asset } from "../asset/Asset";
import type { AmortizationPayment } from "./AmortizationPayment";
import type { RecurringPayment, RecurringPaymentInterval } from "./RecurringPayment";
import { isCashAccount } from "../cash/CashAccount";
import { toMortgageInput } from "./toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { combineSchedules } from "./amortizationDetail";
import { currentBalanceAsOf } from "./scheduleAsOf";

export type ReallocationInterval = Extract<RecurringPaymentInterval, "weekly" | "monthly">;
export type ReallocationDestinationType = "split" | "savings";
export type ReallocationTriggerReason = "initial" | "payoff" | "refix";

export interface ReallocationDestination {
  type: ReallocationDestinationType;
  id: string;
  name: string;
}

export interface ReallocationRegime {
  destination: ReallocationDestination;
  startDate: Date;
  /** Undefined = this regime runs to the end of the plan. */
  endDate?: Date;
  reason: ReallocationTriggerReason;
}

export interface SavingsContribution {
  accountId: string;
  accountName: string;
  totalContributed: number;
  totalInterestEarned: number;
}

export interface ReallocationPlan {
  testAmount: number;
  interval: ReallocationInterval;
  regimes: ReallocationRegime[];
  /** Mortgage interest saved vs. doing nothing, plus interest earned in any savings regimes —
   *  both are "value created" in the same unit, so they're combined into one figure. */
  totalValueCreated: number;
  combinedBaselineSchedule: AmortizationPayment[];
  combinedWithPlanSchedule: AmortizationPayment[];
  savingsContributions: SavingsContribution[];
}

const MAX_REGIMES = 12;

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Scans already-computed schedules for the next point any split's stored interest rate changes
 *  (a scheduled refix) after `after` — reuses data the engine already produced instead of
 *  duplicating SimulationRunner's private refix-date math. */
function findEarliestRateChange(schedules: AmortizationPayment[][], after: Date): Date | undefined {
  const dates = schedules
    .map((schedule) => {
      for (let index = 1; index < schedule.length; index += 1) {
        if (schedule[index].paymentDate > after && schedule[index].annualInterestRate !== schedule[index - 1].annualInterestRate) {
          return schedule[index].paymentDate;
        }
      }
      return undefined;
    })
    .filter((date): date is Date => date !== undefined);
  return dates.length > 0 ? new Date(Math.min(...dates.map((date) => date.getTime()))) : undefined;
}

/** Future value of a recurring contribution compounding at `annualRatePercent`, period by period —
 *  same periodic-rate style as the mortgage engine's own repayment math, just accumulating instead
 *  of amortising. */
function projectSavingsValue(
  from: Date,
  to: Date,
  amount: number,
  interval: ReallocationInterval,
  annualRatePercent: number,
): { totalContributed: number; interestEarned: number } {
  if (to <= from) return { totalContributed: 0, interestEarned: 0 };

  const periodsPerYear = interval === "weekly" ? 52 : 12;
  const periodicRate = annualRatePercent / 100 / periodsPerYear;
  let balance = 0;
  let totalContributed = 0;
  const cursor = new Date(from);

  while (cursor <= to) {
    balance = balance * (1 + periodicRate) + amount;
    totalContributed += amount;
    if (interval === "weekly") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }

  return { totalContributed, interestEarned: balance - totalContributed };
}

/** Builds a hypothetical mortgage with every already-committed regime's bounded recurring payment
 *  applied, plus (optionally) one new candidate payment for evaluation. */
function buildTestMortgage(
  mortgage: MortgageLiability,
  committed: Map<string, RecurringPayment[]>,
  testAmount: number,
  interval: ReallocationInterval,
  candidate?: { splitId: string; startDate: Date; endDate?: Date },
): MortgageLiability {
  return {
    ...mortgage,
    splits: mortgage.splits.map((split) => {
      const committedForSplit = committed.get(split.id) ?? [];
      const candidatePayment: RecurringPayment[] = candidate?.splitId === split.id
        ? [{ id: "candidate", kind: "extra", amount: testAmount, interval, startDate: toIsoDate(candidate.startDate), endDate: candidate.endDate ? toIsoDate(candidate.endDate) : undefined }]
        : [];
      if (committedForSplit.length === 0 && candidatePayment.length === 0) return split;
      return { ...split, recurringPayments: [...(split.recurringPayments ?? []), ...committedForSplit, ...candidatePayment] };
    }),
  };
}

/** Plans where a recurring extra payment should go over the whole life of the loan, not just
 *  today — chaining a sequence of "regimes" that switch whenever the current destination is
 *  fully paid off or any split hits a scheduled refix (its assumed future rate is known data,
 *  not predicted). Each regime is evaluated by literally re-simulating the mortgage with that
 *  regime's payment applied, same as the single-point advisor — no new engine, just chained calls
 *  to the existing one, bounded by `RecurringPayment.endDate` so regimes don't overlap. */
export function planExtraPaymentReallocation(
  mortgage: MortgageLiability,
  assets: Asset[],
  testAmount: number,
  interval: ReallocationInterval,
  asOf: Date = new Date(),
): ReallocationPlan {
  const cashAccounts = assets.filter(isCashAccount).filter((account) => (account.interestRate ?? 0) > 0);
  const mortgageStartDate = new Date(`${mortgage.startDate}T00:00:00`);
  const planHorizon = new Date(Math.max(...mortgage.splits.map((split) => addMonths(mortgageStartDate, split.years * 12).getTime())));

  const committed = new Map<string, RecurringPayment[]>();
  const regimes: ReallocationRegime[] = [];
  const savingsByAccount = new Map<string, SavingsContribution>();

  let currentStart = asOf;
  let reason: ReallocationTriggerReason = "initial";
  let iterations = 0;

  while (currentStart < planHorizon && iterations < MAX_REGIMES) {
    iterations += 1;

    const noFurtherMortgage = buildTestMortgage(mortgage, committed, testAmount, interval);
    const noFurtherResult = MortgageEngine.simulate(toMortgageInput(noFurtherMortgage, assets));
    const nextRefixDate = findEarliestRateChange(noFurtherResult.splits.map((split) => split.schedule), currentStart);
    // Every candidate is evaluated over the SAME bounded window — up to the next mortgage-wide
    // trigger, not "permanently" — otherwise a savings account (which never pays off and so gets
    // credited with growth all the way to the plan horizon) would be unfairly favoured over a
    // split that would naturally finish, and hand off to a next regime, long before then.
    const windowEnd = nextRefixDate ?? planHorizon;

    interface Candidate { destination: ReallocationDestination; valueCreated: number; payoffDate?: Date }
    const candidates: Candidate[] = [];

    mortgage.splits.forEach((split, index) => {
      if (split.productType === "revolving-credit") return;
      const schedule = noFurtherResult.splits[index]?.schedule ?? [];
      if (currentBalanceAsOf(schedule, currentStart) <= 0) return;

      const testMortgage = buildTestMortgage(mortgage, committed, testAmount, interval, { splitId: split.id, startDate: currentStart, endDate: windowEnd });
      const testResult = MortgageEngine.simulate(toMortgageInput(testMortgage, assets));
      const testSchedule = testResult.splits[index]?.schedule ?? [];
      const last = testSchedule.at(-1);

      candidates.push({
        destination: { type: "split", id: split.id, name: split.name },
        valueCreated: noFurtherResult.totalInterest - testResult.totalInterest,
        payoffDate: last?.closingBalance === 0 ? last.paymentDate : undefined,
      });
    });

    for (const account of cashAccounts) {
      const { interestEarned } = projectSavingsValue(currentStart, windowEnd, testAmount, interval, account.interestRate ?? 0);
      candidates.push({ destination: { type: "savings", id: account.id, name: account.name }, valueCreated: interestEarned });
    }

    if (candidates.length === 0) break;

    const best = candidates.reduce((max, candidate) => (candidate.valueCreated > max.valueCreated ? candidate : max));
    const triggerDates = [best.payoffDate, nextRefixDate].filter((date): date is Date => date !== undefined && date > currentStart);
    const regimeEnd = triggerDates.length > 0 ? new Date(Math.min(...triggerDates.map((date) => date.getTime()))) : undefined;

    regimes.push({ destination: best.destination, startDate: currentStart, endDate: regimeEnd, reason });

    if (best.destination.type === "split") {
      const payments = committed.get(best.destination.id) ?? [];
      payments.push({
        id: `regime-${regimes.length}`,
        kind: "extra",
        amount: testAmount,
        interval,
        startDate: toIsoDate(currentStart),
        endDate: regimeEnd ? toIsoDate(regimeEnd) : undefined,
      });
      committed.set(best.destination.id, payments);
    } else {
      const account = cashAccounts.find((candidate) => candidate.id === best.destination.id);
      const { totalContributed, interestEarned } = projectSavingsValue(currentStart, regimeEnd ?? planHorizon, testAmount, interval, account?.interestRate ?? 0);
      const existing = savingsByAccount.get(best.destination.id);
      savingsByAccount.set(best.destination.id, {
        accountId: best.destination.id,
        accountName: best.destination.name,
        totalContributed: (existing?.totalContributed ?? 0) + totalContributed,
        totalInterestEarned: (existing?.totalInterestEarned ?? 0) + interestEarned,
      });
    }

    if (!regimeEnd) break;
    reason = best.payoffDate && regimeEnd.getTime() === best.payoffDate.getTime() ? "payoff" : "refix";
    currentStart = regimeEnd;
  }

  const trueBaselineResult = MortgageEngine.simulate(toMortgageInput(mortgage, assets));
  const withPlanMortgage = buildTestMortgage(mortgage, committed, testAmount, interval);
  const withPlanResult = MortgageEngine.simulate(toMortgageInput(withPlanMortgage, assets));
  const totalSavingsInterest = [...savingsByAccount.values()].reduce((sum, contribution) => sum + contribution.totalInterestEarned, 0);

  return {
    testAmount,
    interval,
    regimes,
    totalValueCreated: (trueBaselineResult.totalInterest - withPlanResult.totalInterest) + totalSavingsInterest,
    combinedBaselineSchedule: combineSchedules(trueBaselineResult.splits.map((split) => split.schedule)),
    combinedWithPlanSchedule: combineSchedules(withPlanResult.splits.map((split) => split.schedule)),
    savingsContributions: [...savingsByAccount.values()],
  };
}
