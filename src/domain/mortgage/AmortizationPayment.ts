export interface AmortizationPayment {
  paymentNumber: number;

  paymentDate: Date;

  annualInterestRate: number;

  openingBalance: number;

  repayment: number;

  scheduledRepayment: number;

  extraPayment: number;

  interest: number;

  principal: number;

  closingBalance: number;
}
