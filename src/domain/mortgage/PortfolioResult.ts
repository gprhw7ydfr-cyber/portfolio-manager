import type { MortgageResult } from "./MortgageResult";

export interface PortfolioResult {
  totalRepayment: number;
  totalInterest: number;
  repayment: number;

  splits: MortgageResult[];
}