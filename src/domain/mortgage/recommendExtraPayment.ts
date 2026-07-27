import type { MortgageLiability } from "./MortgageLiability";
import type { Asset } from "../asset/Asset";
import type { AmortizationPayment } from "./AmortizationPayment";
import { toMortgageInput } from "./toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { BalanceAdjustmentEvent } from "./events/BalanceAdjustmentEvent";
import { findPaymentIndexAsOf, currentBalanceAsOf } from "./scheduleAsOf";

export type ExtraPaymentMode = "lump-sum" | "weekly" | "monthly";

/** Decomposes interestSaved into what this split's own extra payment accounts for directly, vs.
 *  what redistribution transfers with the other splits account for — present only when the
 *  mortgage has any refixBalanceTarget configured. The two always sum back to interestSaved. */
export interface RedistributionBreakdown {
  directInterestSaved: number;
  redistributionInterestSaved: number;
  directPayoffDateBaseline?: Date;
  directPayoffDateWithExtraPayment?: Date;
}

export interface ExtraPaymentOption {
  splitId: string;
  splitName: string;
  /** vs. the baseline (no extra payment) — always exact, never approximated, because it comes
   *  from re-running the real simulation with the test amount applied, not a rate heuristic. */
  interestSaved: number;
  baselineSchedule: AmortizationPayment[];
  withExtraPaymentSchedule: AmortizationPayment[];
  payoffDateBaseline?: Date;
  payoffDateWithExtraPayment?: Date;
  redistributionBreakdown?: RedistributionBreakdown;
}

export interface ExtraPaymentAnalysis {
  testAmount: number;
  mode: ExtraPaymentMode;
  /** Sorted descending by interestSaved. Excludes revolving-credit splits (extra payments don't
   *  reduce their balance in this engine) and splits already paid off as of `asOf`. */
  options: ExtraPaymentOption[];
}

/** Builds a hypothetical mortgage with `testAmount` directed at `splitId` — a one-off lump sum
 *  today, or a recurring weekly/monthly extra payment from today on — reused by both the ranked
 *  comparison below and anything that wants to show what following a recommendation actually
 *  does to the whole mortgage. */
export function buildExtraPaymentTestMortgage(
  mortgage: MortgageLiability,
  splitId: string,
  testAmount: number,
  mode: ExtraPaymentMode,
  asOf: Date,
  baselineSchedule: AmortizationPayment[],
): MortgageLiability {
  return {
    ...mortgage,
    splits: mortgage.splits.map((candidate) => {
      if (candidate.id !== splitId) return candidate;

      if (mode === "lump-sum") {
        const paymentNumber = findPaymentIndexAsOf(baselineSchedule, asOf) + 1;
        return { ...candidate, events: [...(candidate.events ?? []), new BalanceAdjustmentEvent(paymentNumber, -testAmount)] };
      }

      return {
        ...candidate,
        recurringPayments: [
          ...(candidate.recurringPayments ?? []),
          { id: "extra-payment-test", kind: "extra", amount: testAmount, interval: mode, startDate: asOf.toISOString().slice(0, 10) },
        ],
      };
    }),
  };
}

/** Answers "if I put testAmount into split A vs split B today, which produces less total
 *  interest?" by literally simulating each candidate — so offset, redistribution, and refixing
 *  are all accounted for exactly as they actually behave, not approximated by a nominal rate.
 *  `mode` chooses how the test amount is applied: a one-off lump sum today, or a recurring
 *  weekly/monthly extra payment from today on — the engine already supports both natively. */
export function recommendExtraPayment(
  mortgage: MortgageLiability,
  assets: Asset[],
  testAmount: number,
  mode: ExtraPaymentMode = "lump-sum",
  asOf: Date = new Date(),
): ExtraPaymentAnalysis {
  const baseline = MortgageEngine.simulate(toMortgageInput(mortgage, assets));
  const options: ExtraPaymentOption[] = [];

  // Redistribution is mortgage-wide — a candidate that has no target of its own can still be
  // indirectly affected by paying it down changing what's available to redistribute among the
  // splits that do, so isolation strips refixBalanceTarget everywhere, not just on the candidate.
  const hasRedistribution = mortgage.splits.some((split) => split.refixBalanceTarget !== undefined);
  const noRedistributionMortgage: MortgageLiability = hasRedistribution
    ? { ...mortgage, splits: mortgage.splits.map((split) => ({ ...split, refixBalanceTarget: undefined })) }
    : mortgage;
  const noRedistributionBaseline = hasRedistribution
    ? MortgageEngine.simulate(toMortgageInput(noRedistributionMortgage, assets))
    : undefined;

  mortgage.splits.forEach((split, index) => {
    if (split.productType === "revolving-credit") return;

    const baselineSchedule = baseline.splits[index]?.schedule ?? [];
    if (currentBalanceAsOf(baselineSchedule, asOf) <= 0) return;

    const testMortgage = buildExtraPaymentTestMortgage(mortgage, split.id, testAmount, mode, asOf, baselineSchedule);
    const testResult = MortgageEngine.simulate(toMortgageInput(testMortgage, assets));
    const withExtraPaymentSchedule = testResult.splits[index]?.schedule ?? [];
    const interestSaved = baseline.totalInterest - testResult.totalInterest;

    let redistributionBreakdown: RedistributionBreakdown | undefined;
    if (noRedistributionBaseline) {
      const noRedistributionBaselineSchedule = noRedistributionBaseline.splits[index]?.schedule ?? [];
      const noRedistributionTestMortgage = buildExtraPaymentTestMortgage(noRedistributionMortgage, split.id, testAmount, mode, asOf, noRedistributionBaselineSchedule);
      const noRedistributionTestResult = MortgageEngine.simulate(toMortgageInput(noRedistributionTestMortgage, assets));
      const noRedistributionTestSchedule = noRedistributionTestResult.splits[index]?.schedule ?? [];
      const directInterestSaved = noRedistributionBaseline.totalInterest - noRedistributionTestResult.totalInterest;

      redistributionBreakdown = {
        directInterestSaved,
        redistributionInterestSaved: interestSaved - directInterestSaved,
        directPayoffDateBaseline: noRedistributionBaselineSchedule.at(-1)?.paymentDate,
        directPayoffDateWithExtraPayment: noRedistributionTestSchedule.at(-1)?.paymentDate,
      };
    }

    options.push({
      splitId: split.id,
      splitName: split.name,
      interestSaved,
      baselineSchedule,
      withExtraPaymentSchedule,
      payoffDateBaseline: baselineSchedule.at(-1)?.paymentDate,
      payoffDateWithExtraPayment: withExtraPaymentSchedule.at(-1)?.paymentDate,
      redistributionBreakdown,
    });
  });

  options.sort((a, b) => b.interestSaved - a.interestSaved);

  return { testAmount, mode, options };
}
