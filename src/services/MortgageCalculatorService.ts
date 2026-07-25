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

export interface MortgageResult {
  repayment: number;
  totalRepayment: number;
  totalInterest: number;
  numberOfPayments: number;
}

export class MortgageCalculatorService {
  static calculate(input: MortgageInput): MortgageResult {
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
    };
  }
}