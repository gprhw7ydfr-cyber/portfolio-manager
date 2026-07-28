import type { OwnershipEntity } from "../shared/OwnershipEntity";
import type { Asset } from "../asset/Asset";
import type { Liability } from "../liability/Liability";
import type { Scenario } from "../scenario/Scenario";
import type { MortgageScenario } from "../mortgage/MortgageScenario";
import type { MortgageStrategy } from "../mortgage/MortgageStrategy";

export interface Portfolio {
  id: string;
  name: string;
  entities: OwnershipEntity[];
  assets: Asset[];
  liabilities: Liability[];
  scenarios: Scenario[];
  /** Mortgage Lab: saved, unattached mortgage-structure drafts and the strategies layered on
   *  top of them — invisible to dashboard metrics until attached to a property (see
   *  createMortgageLiabilityFromStructure.ts). Unrelated to `scenarios` above (the portfolio-wide
   *  annual-projection Scenario/StrategyEvent system). */
  mortgageScenarios: MortgageScenario[];
  mortgageStrategies: MortgageStrategy[];
}
