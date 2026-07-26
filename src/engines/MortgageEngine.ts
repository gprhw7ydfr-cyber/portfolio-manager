import type { MortgageInput } from "../domain/mortgage/MortgageInput";

import { SimulationRunner } from "./SimulationRunner";

export class MortgageEngine {
  static simulate(input: MortgageInput) {
    return SimulationRunner.run(input);
  }
}
    