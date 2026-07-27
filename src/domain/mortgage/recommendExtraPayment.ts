import type { MortgageLiability } from "./MortgageLiability";
import type { Asset } from "../asset/Asset";
import type { AmortizationPayment } from "./AmortizationPayment";
import { toMortgageInput } from "./toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { BalanceAdjustmentEvent } from "./events/BalanceAdjustmentEvent";
import { findPaymentIndexAsOf, currentBalanceAsOf } from "./scheduleAsOf";

export type ExtraPaymentMode = "lump-sum" | "weekly" | "monthly";

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
}

export interface ExtraPaymentAnalysis {
  testAmount: number;
  mode: ExtraPaymentMode;
  /** Sorted descending by interestSaved. Excludes revolving-credit splits (extra payments don't
   *  reduce their balance in this engine) and splits already paid off as of `asOf`. */
  options: ExtraPaymentOption[];
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

  mortgage.splits.forEach((split, index) => {
    if (split.productType === "revolving-credit") return;

    const baselineSchedule = baseline.splits[index]?.schedule ?? [];
    if (currentBalanceAsOf(baselineSchedule, asOf) <= 0) return;

    const testMortgage: MortgageLiability = {
      ...mortgage,
      splits: mortgage.splits.map((candidate, candidateIndex) => {
        if (candidateIndex !== index) return candidate;

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

    const testResult = MortgageEngine.simulate(toMortgageInput(testMortgage, assets));
    const withExtraPaymentSchedule = testResult.splits[index]?.schedule ?? [];

    options.push({
      splitId: split.id,
      splitName: split.name,
      interestSaved: baseline.totalInterest - testResult.totalInterest,
      baselineSchedule,
      withExtraPaymentSchedule,
      payoffDateBaseline: baselineSchedule.at(-1)?.paymentDate,
      payoffDateWithExtraPayment: withExtraPaymentSchedule.at(-1)?.paymentDate,
    });
  });

  options.sort((a, b) => b.interestSaved - a.interestSaved);

  return { testAmount, mode, options };
}
