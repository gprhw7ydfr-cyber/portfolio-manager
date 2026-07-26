import type { MortgageResult } from "./MortgageResult";

export interface MortgageSummary {
  totalRepayment: number;
  totalInterest: number;
  repayment: number;

  splits: MortgageResult[];
}