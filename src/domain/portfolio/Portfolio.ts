import type { OwnershipEntity } from "../shared/OwnershipEntity";
import type { Asset } from "../asset/Asset";
import type { Liability } from "../liability/Liability";
import type { Scenario } from "../scenario/Scenario";

export interface Portfolio {
  id: string;
  name: string;
  entities: OwnershipEntity[];
  assets: Asset[];
  liabilities: Liability[];
  scenarios: Scenario[];
}
