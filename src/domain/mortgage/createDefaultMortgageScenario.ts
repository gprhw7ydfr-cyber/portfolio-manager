import type { MortgageScenario } from "./MortgageScenario";
import { createDefaultSplit } from "./createDefaultSplit";

export const createDefaultMortgageScenario = (name: string, values?: Partial<MortgageScenario>): MortgageScenario => ({
  frequency: "monthly",
  startDate: new Date().toISOString().slice(0, 10),
  splits: [createDefaultSplit("Main loan")],
  ...values,
  id: crypto.randomUUID(),
  name,
});
