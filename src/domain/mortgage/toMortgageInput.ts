import type { MortgageInput } from "./MortgageInput";
import type { MortgageLiability } from "./MortgageLiability";
import type { Asset } from "../asset/Asset";

/** Resolves any split's linked offset account into its offsetBalance before handing off to
 *  SimulationRunner, which only ever sees a plain resolved number — it has no notion of a Portfolio. */
export function toMortgageInput(mortgage: MortgageLiability, assets: Asset[] = []): MortgageInput {
  return {
    frequency: mortgage.frequency,
    startDate: new Date(`${mortgage.startDate}T00:00:00`),
    splits: mortgage.splits.map((split) => {
      const linkedAccountId = split.offsetSettings?.linkedAccountId;
      const linkedAccount = linkedAccountId ? assets.find((asset) => asset.id === linkedAccountId) : undefined;
      if (!linkedAccount || !split.offsetSettings) return split;

      return {
        ...split,
        offsetSettings: { ...split.offsetSettings, offsetBalance: linkedAccount.currentValue },
      };
    }),
  };
}
