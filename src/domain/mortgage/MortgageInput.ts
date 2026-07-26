import type { MortgageEvent } from "./events/MortgageEvent";
import type { MortgageSplit } from "./MortgageSplit";

export type RepaymentFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly";

export interface MortgageInput {
  principal?: number;
  annualInterestRate?: number;
  years?: number;

  frequency: RepaymentFrequency;
  startDate: Date;

  events?: MortgageEvent[];

  // Sprint 5
  splits?: MortgageSplit[];
}