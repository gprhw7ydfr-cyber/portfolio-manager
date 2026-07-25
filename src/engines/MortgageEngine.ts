import type { MortgageInput } from "../domain/mortgage/MortgageInput";

import type { MortgageResult } from "../domain/mortgage/MortgageResult";

export class MortgageEngine {
  static simulate(input: MortgageInput): MortgageResult {
    const periodsPerYear =
      input.frequency === "weekly"
        ? 52
        : input.frequency === "fortnightly"
        ? 26
        : 12;

    const n = input.years * periodsPerYear;
    const r = input.annualInterestRate / 100 / periodsPerYear;

    const repayment =
      (input.principal * r * Math.pow(1 + r, n)) /
      (Math.pow(1 + r, n) - 1);

    const totalRepayment = repayment * n;
    const totalInterest = totalRepayment - input.principal;

   return {
  repayment,
  totalRepayment,
  totalInterest,
  numberOfPayments: n,
  schedule: [],
   };
  }
}