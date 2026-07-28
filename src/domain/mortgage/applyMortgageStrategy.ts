import type { MortgageStructure } from "./MortgageStructure";
import type { MortgageStrategy } from "./MortgageStrategy";
import type { Asset } from "../asset/Asset";
import { toMortgageInput } from "./toMortgageInput";
import { buildExtraPaymentTestMortgage } from "./recommendExtraPayment";
import { MortgageEngine } from "../../engines/MortgageEngine";

/** Merges a strategy's per-split rate/refix overrides onto a structure's splits. A split's
 *  `fixedRateSettings` override only applies if the split already has fixedRateSettings to merge
 *  onto — a strategy can't fabricate the required `fixedRateTermMonths`/`refixTermMonths` fields
 *  out of nothing, so an override aimed at a split with no base fixed-rate settings is a no-op. */
function applySplitOverrides<T extends MortgageStructure>(structure: T, strategy: MortgageStrategy): T {
  if (!strategy.splitOverrides) return structure;
  return {
    ...structure,
    splits: structure.splits.map((split) => {
      const override = strategy.splitOverrides?.[split.id];
      if (!override) return split;
      return {
        ...split,
        ...(override.annualInterestRate !== undefined && { annualInterestRate: override.annualInterestRate }),
        ...(override.rateType !== undefined && { rateType: override.rateType }),
        ...(override.refixBalanceTarget !== undefined && { refixBalanceTarget: override.refixBalanceTarget }),
        ...(override.fixedRateSettings !== undefined && split.fixedRateSettings !== undefined && {
          fixedRateSettings: { ...split.fixedRateSettings, ...override.fixedRateSettings },
        }),
      };
    }),
  } as T;
}

/** Applies a saved strategy's rate/refix overrides and extra-payment targets onto a scenario (or
 *  any MortgageStructure), producing a new structure of the same shape. Extra payments are folded
 *  in via the same `buildExtraPaymentTestMortgage` the single-mortgage extra payment advisor
 *  already uses, against one baseline simulation of the overridden structure (not re-simulated
 *  per target — a lump sum's placement depends only on where `asOf` falls in its own split's
 *  schedule, which extra payments on other targets don't move). Because the result is produced by
 *  setting ordinary `MortgageSplit` fields, it's indistinguishable from something a user
 *  configured by hand — no separate "materialize" step is needed before attaching it. */
export function applyMortgageStrategy<T extends MortgageStructure>(
  structure: T,
  strategy: MortgageStrategy,
  assets: Asset[],
  asOf: Date = new Date(),
): T {
  const overridden = applySplitOverrides(structure, strategy);

  const extraPayments = strategy.extraPayments ?? [];
  if (extraPayments.length === 0) return overridden;

  const baseline = MortgageEngine.simulate(toMortgageInput(overridden, assets));
  return extraPayments.reduce((current, target) => {
    const splitIndex = overridden.splits.findIndex((split) => split.id === target.splitId);
    if (splitIndex === -1) return current;
    const baselineSchedule = baseline.splits[splitIndex]?.schedule ?? [];
    return buildExtraPaymentTestMortgage(current, target.splitId, target.amount, target.mode, asOf, baselineSchedule);
  }, overridden);
}
