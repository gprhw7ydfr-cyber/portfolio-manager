import type { MortgageLiability } from "./MortgageLiability";
import type { Asset } from "../asset/Asset";
import { toMortgageInput } from "./toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { BalanceAdjustmentEvent } from "./events/BalanceAdjustmentEvent";
import { findPaymentIndexAsOf, currentBalanceAsOf } from "./scheduleAsOf";

export interface ExtraPaymentOption {
  splitId: string;
  splitName: string;
  /** vs. the baseline (no extra payment) — always exact, never approximated, because it comes
   *  from re-running the real simulation with the test amount applied, not a rate heuristic. */
  interestSaved: number;
}

export interface ExtraPaymentAnalysis {
  testAmount: number;
  /** Sorted descending by interestSaved. Excludes revolving-credit splits (extra payments don't
   *  reduce their balance in this engine) and splits already paid off as of `asOf`. */
  options: ExtraPaymentOption[];
}

/** Answers "if I put testAmount into split A vs split B today, which produces less total
 *  interest?" by literally simulating each candidate — so offset, redistribution, and refixing
 *  are all accounted for exactly as they actually behave, not approximated by a nominal rate. */
export function recommendExtraPayment(
  mortgage: MortgageLiability,
  assets: Asset[],
  testAmount: number,
  asOf: Date = new Date(),
): ExtraPaymentAnalysis {
  const baseline = MortgageEngine.simulate(toMortgageInput(mortgage, assets));
  const options: ExtraPaymentOption[] = [];

  mortgage.splits.forEach((split, index) => {
    if (split.productType === "revolving-credit") return;

    const schedule = baseline.splits[index]?.schedule ?? [];
    if (currentBalanceAsOf(schedule, asOf) <= 0) return;

    const paymentNumber = findPaymentIndexAsOf(schedule, asOf) + 1;
    const testMortgage: MortgageLiability = {
      ...mortgage,
      splits: mortgage.splits.map((candidate, candidateIndex) =>
        candidateIndex === index
          ? { ...candidate, events: [...(candidate.events ?? []), new BalanceAdjustmentEvent(paymentNumber, -testAmount)] }
          : candidate,
      ),
    };

    const testResult = MortgageEngine.simulate(toMortgageInput(testMortgage, assets));
    options.push({
      splitId: split.id,
      splitName: split.name,
      interestSaved: baseline.totalInterest - testResult.totalInterest,
    });
  });

  options.sort((a, b) => b.interestSaved - a.interestSaved);

  return { testAmount, options };
}
