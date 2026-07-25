import type { AmortizationPayment } from "./AmortizationPayment";

export interface MortgageResult {
  repayment: number;
  totalRepayment: number;
  totalInterest: number;
  numberOfPayments: number;

  schedule: AmortizationPayment[];
}