export type RepaymentFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly";

export interface MortgageInput {
  principal: number;
  annualInterestRate: number;
  years: number;
  frequency: RepaymentFrequency;
}