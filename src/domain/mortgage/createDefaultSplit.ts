import type { MortgageSplit } from "./MortgageSplit";

export const createDefaultSplit = (name: string, values?: Partial<MortgageSplit>): MortgageSplit => ({
  principal: 100000,
  annualInterestRate: 5.75,
  years: 30,
  ...values,
  id: crypto.randomUUID(),
  name,
});
