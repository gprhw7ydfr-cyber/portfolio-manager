import type { MortgageResult } from "./MortgageResult";

export interface MortgageSummary {
  totalRepayment: number;
  totalInterest: number;
  repayment: number;

  /** Undefined unless every split actually reaches a zero balance within its term
   *  (e.g. absent if any split is revolving credit, which never fully pays off). */
  payoffDate?: Date;

  splits: MortgageResult[];
}