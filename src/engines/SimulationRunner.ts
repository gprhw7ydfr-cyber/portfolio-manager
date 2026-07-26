import type { MortgageInput } from "../domain/mortgage/MortgageInput";
import type { MortgageResult } from "../domain/mortgage/MortgageResult";
import type { AmortizationPayment } from "../domain/mortgage/AmortizationPayment";
import type { MortgageSimulationState } from "../domain/mortgage/MortgageSimulationState";
import type { MortgageSplit } from "../domain/mortgage/MortgageSplit";
import type { PortfolioResult } from "../domain/mortgage/PortfolioResult";
import type { RecurringPayment, RecurringPaymentInterval } from "../domain/mortgage/RecurringPayment";
import type { FixedRateSettings } from "../domain/mortgage/FixedRateSettings";
import type { RevolvingCreditTransaction } from "../domain/mortgage/MortgageProduct";
import { BalanceAdjustmentEvent } from "../domain/mortgage/events/BalanceAdjustmentEvent";

export class SimulationRunner {
 static run(input: MortgageInput): PortfolioResult {

    const split: MortgageSplit = {
    id: "legacy",
    name: "Mortgage",
    principal: input.principal,
    annualInterestRate: input.annualInterestRate,
    years: input.years,
      events: input.events,
  };

  const splits = input.splits ?? [split];
  const simulatedSplits = splits.map((item) => ({ ...item, events: [...(item.events ?? [])] }));
  let results = simulatedSplits.map((item) => this.runSplit(item, input));

  for (const [paymentNumber, refixingSplitIds] of this.refixTriggers(simulatedSplits, input)) {
    let transfersAdded = false;
    const sourceIndices = refixingSplitIds
      .map((id) => simulatedSplits.findIndex((item) => item.id === id))
      .filter((index) => index >= 0);

    for (const [targetIndex, targetSplit] of simulatedSplits.entries()) {
      if (targetSplit.productType !== "offset" || !targetSplit.offsetSettings?.maintainLoanBalanceAtRefix) continue;

      const targetBalance = results[targetIndex].schedule[paymentNumber - 1]?.openingBalance ?? 0;
      let amountNeeded = Math.max((targetSplit.offsetSettings.refixLoanBalanceTarget ?? 0) - targetBalance, 0);

      for (const sourceIndex of sourceIndices) {
        if (amountNeeded <= 0 || sourceIndex === targetIndex) break;
        const sourceBalance = results[sourceIndex].schedule[paymentNumber - 1]?.openingBalance ?? 0;
        const transfer = Math.min(amountNeeded, sourceBalance);
        if (transfer <= 0) continue;

        simulatedSplits[sourceIndex].events?.push(new BalanceAdjustmentEvent(paymentNumber, -transfer));
        simulatedSplits[targetIndex].events?.push(new BalanceAdjustmentEvent(paymentNumber, transfer));
        amountNeeded -= transfer;
        transfersAdded = true;
      }
    }

    if (transfersAdded) results = simulatedSplits.map((item) => this.runSplit(item, input));
  }

const portfolio = {
  repayment: results.reduce(
    (sum, result) => sum + result.repayment,
    0
  ),

  totalRepayment: results.reduce(
    (sum, result) => sum + result.totalRepayment,
    0
  ),

  totalInterest: results.reduce(
    (sum, result) => sum + result.totalInterest,
    0
  ),

  splits: results,
};

return portfolio;
 }

  static runSplit(
    split: MortgageSplit,
    input: MortgageInput,
  ): MortgageResult {

    const periodsPerYear =
      input.frequency === "weekly"
        ? 52
        : input.frequency === "fortnightly"
        ? 26
        : 12;

    const n = split.years * periodsPerYear;

    const schedule: AmortizationPayment[] = [];

    const state: MortgageSimulationState = {
      balance: split.principal,
      annualRate: split.annualInterestRate,
      offsetBalance: split.productType === "offset" ? Math.max(split.offsetSettings?.offsetBalance ?? 0, 0) : 0,
    };

    const events = [...(input.events ?? []), ...(split.events ?? [])];

    let totalRepayment = 0;
    let totalInterest = 0;
    const fixedRateSettings = split.rateType === "fixed" && this.isValidFixedRateSettings(split.fixedRateSettings)
      ? split.fixedRateSettings
      : undefined;
    let nextRefixDate = fixedRateSettings
      ? this.addMonths(new Date(input.startDate), fixedRateSettings.fixedRateTermMonths)
      : undefined;
    let scheduledRepayment = split.productType === "revolving-credit" ? 0 : this.calculateRepayment(
      state.balance,
      state.annualRate / 100 / periodsPerYear,
      n,
    );

    for (let paymentNumber = 1; paymentNumber <= n; paymentNumber++) {

      const paymentDate = this.calculatePaymentDate(input.startDate, input.frequency, paymentNumber);
      const rateBeforeEvents = state.annualRate;
      if (fixedRateSettings && nextRefixDate) {
        nextRefixDate = this.applyAutomaticRefix(state, paymentDate, fixedRateSettings, nextRefixDate);
      }
      for (const event of events) {
        if (event.applies(paymentNumber)) {
          event.execute(state);
        }
      }

      if (state.annualRate !== rateBeforeEvents) {
        scheduledRepayment = this.calculateRepayment(
          state.balance,
          state.annualRate / 100 / periodsPerYear,
          n - paymentNumber + 1,
        );
      }

      const previousPaymentDate = paymentNumber === 1
        ? new Date(input.startDate.getTime() - 1)
        : this.calculatePaymentDate(input.startDate, input.frequency, paymentNumber - 1);

      const periodicRate = state.annualRate / 100 / periodsPerYear;

      if (split.productType === "revolving-credit") {
        state.balance = this.applyRevolvingCreditTransactions(
          state.balance,
          split.revolvingCreditSettings?.creditLimit ?? split.principal,
          split.revolvingCreditSettings?.transactions ?? [],
          previousPaymentDate,
          paymentDate,
        );
      }

      const openingBalance = state.balance;

      const extraPayment = this.recurringPaymentTotal(
        split.recurringPayments ?? [],
        previousPaymentDate,
        paymentDate,
      );

      const paymentAmounts = split.productType === "revolving-credit"
        ? this.calculateRevolvingCreditPayment(openingBalance, periodicRate)
        : this.calculatePaymentAmounts(
          openingBalance,
          Math.max(openingBalance - (state.offsetBalance ?? 0), 0) * periodicRate,
          scheduledRepayment,
          extraPayment,
        );
      const { interest, principalPaid, actualRepayment, closingBalance, actualExtraPayment } = paymentAmounts;

      const payment = this.createPayment(
  paymentNumber,
  paymentDate,
  state.annualRate,
  openingBalance,
  actualRepayment,
  scheduledRepayment,
  actualExtraPayment,
  interest,
  principalPaid,
  closingBalance
);

      totalRepayment += actualRepayment;
      totalInterest += interest;

      schedule.push(payment);

      state.balance = closingBalance;

      if (state.balance === 0) {
        break;
      }
    }

    return {
      repayment: schedule[0]?.repayment ?? 0,
      totalRepayment,
      totalInterest,
      numberOfPayments: schedule.length,
      schedule,
    };
  }
  private static calculatePaymentDate(
  startDate: Date,
  frequency: MortgageInput["frequency"],
  paymentNumber: number
): Date {
  const paymentDate = new Date(startDate);

  if (frequency === "monthly") {
    paymentDate.setMonth(
      paymentDate.getMonth() + (paymentNumber - 1)
    );
  } else if (frequency === "fortnightly") {
    paymentDate.setDate(
      paymentDate.getDate() + (paymentNumber - 1) * 14
    );
  } else {
    paymentDate.setDate(
      paymentDate.getDate() + (paymentNumber - 1) * 7
    );
  }

  return paymentDate;
}
private static calculateRepayment(
  balance: number,
  periodicRate: number,
  remainingPayments: number
): number {

  if (periodicRate === 0) {
    return balance / remainingPayments;
  }

  const growth = Math.pow(
    1 + periodicRate,
    remainingPayments
  );

  return (
    (balance * periodicRate * growth) /
    (growth - 1)
  );
}
private static createPayment(
  paymentNumber: number,
  paymentDate: Date,
  annualInterestRate: number,
  openingBalance: number,
  repayment: number,
  scheduledRepayment: number,
  extraPayment: number,
  interest: number,
  principal: number,
  closingBalance: number
): AmortizationPayment {
  return {
    paymentNumber,
    paymentDate,
    annualInterestRate,
    openingBalance,
    repayment,
    scheduledRepayment,
    extraPayment,
    interest,
    principal,
    closingBalance,
  };
}
private static calculatePaymentAmounts(
  openingBalance: number,
  interest: number,
  repayment: number,
  requestedExtraPayment: number,
) {
  const principal = repayment - interest;

  const principalPaid = Math.min(principal, openingBalance);

  const balanceAfterScheduledPayment = openingBalance - principalPaid;
  const actualExtraPayment = Math.min(Math.max(requestedExtraPayment, 0), balanceAfterScheduledPayment);
  const actualRepayment = interest + principalPaid + actualExtraPayment;

  let closingBalance = balanceAfterScheduledPayment - actualExtraPayment;

  if (Math.abs(closingBalance) < 0.01) {
    closingBalance = 0;
  }

  return {
    interest,
    principalPaid,
    actualRepayment,
    actualExtraPayment,
    closingBalance,
  };
}

private static calculateRevolvingCreditPayment(openingBalance: number, periodicRate: number) {
  const interest = openingBalance * periodicRate;
  return {
    interest,
    principalPaid: 0,
    actualRepayment: interest,
    actualExtraPayment: 0,
    closingBalance: openingBalance,
  };
}

private static applyRevolvingCreditTransactions(
  balance: number,
  creditLimit: number,
  transactions: RevolvingCreditTransaction[],
  afterDate: Date,
  onOrBeforeDate: Date,
): number {
  const deposits = this.recurringTransactionTotal(transactions, "deposit", afterDate, onOrBeforeDate);
  const withdrawals = this.recurringTransactionTotal(transactions, "withdrawal", afterDate, onOrBeforeDate);
  return Math.min(Math.max(balance - deposits + withdrawals, 0), Math.max(creditLimit, 0));
}

private static recurringTransactionTotal(
  transactions: RevolvingCreditTransaction[],
  type: RevolvingCreditTransaction["type"],
  afterDate: Date,
  onOrBeforeDate: Date,
): number {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + this.occurrencesInPeriod(transaction, afterDate, onOrBeforeDate) * transaction.amount, 0);
}

private static recurringPaymentTotal(
  payments: RecurringPayment[],
  afterDate: Date,
  onOrBeforeDate: Date,
): number {
  return payments.reduce((total, payment) => total + this.occurrencesInPeriod(payment, afterDate, onOrBeforeDate) * payment.amount, 0);
}

private static occurrencesInPeriod(
  payment: Pick<RecurringPayment, "amount" | "startDate" | "interval">,
  afterDate: Date,
  onOrBeforeDate: Date,
): number {
  if (!Number.isFinite(payment.amount) || payment.amount <= 0) return 0;
const occurrence = new Date(`${payment.startDate}T00:00:00`);
  if (Number.isNaN(occurrence.getTime()) || occurrence > onOrBeforeDate) return 0;

  let count = 0;
  while (occurrence <= onOrBeforeDate) {
    if (occurrence > afterDate) count += 1;
    this.addInterval(occurrence, payment.interval);
  }

  return count;
}

private static applyAutomaticRefix(
  state: MortgageSimulationState,
  paymentDate: Date,
  settings: FixedRateSettings,
  nextRefixDate: Date,
): Date {
  let nextDate = nextRefixDate;
  while (paymentDate >= nextDate) {
    state.annualRate = settings.refixAnnualRate;
    nextDate = this.addMonths(nextDate, settings.refixTermMonths);
  }
  return nextDate;
}

private static isValidFixedRateSettings(settings: FixedRateSettings | undefined): settings is FixedRateSettings {
  return Boolean(
    settings
    && Number.isFinite(settings.refixAnnualRate)
    && settings.refixAnnualRate >= 0
    && Number.isFinite(settings.fixedRateTermMonths)
    && settings.fixedRateTermMonths > 0
    && Number.isFinite(settings.refixTermMonths)
    && settings.refixTermMonths > 0,
  );
}

private static addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

private static refixTriggers(splits: MortgageSplit[], input: MortgageInput): Map<number, string[]> {
  const triggers = new Map<number, string[]>();
  const periodsPerYear = input.frequency === "weekly" ? 52 : input.frequency === "fortnightly" ? 26 : 12;

  for (const split of splits) {
    const settings = split.rateType === "fixed" && this.isValidFixedRateSettings(split.fixedRateSettings)
      ? split.fixedRateSettings
      : undefined;
    if (!settings) continue;

    const splitFinalDate = this.addMonths(input.startDate, split.years * 12);
    let refixDate = this.addMonths(input.startDate, settings.fixedRateTermMonths);
    while (refixDate <= splitFinalDate) {
      const paymentNumber = this.firstPaymentOnOrAfter(input, refixDate, split.years * periodsPerYear);
      if (paymentNumber) {
        const current = triggers.get(paymentNumber) ?? [];
        current.push(split.id);
        triggers.set(paymentNumber, current);
      }
      refixDate = this.addMonths(refixDate, settings.refixTermMonths);
    }
  }
  return new Map([...triggers.entries()].sort(([first], [second]) => first - second));
}

private static firstPaymentOnOrAfter(input: MortgageInput, date: Date, maximumPayments: number): number | undefined {
  for (let paymentNumber = 1; paymentNumber <= maximumPayments; paymentNumber += 1) {
    if (this.calculatePaymentDate(input.startDate, input.frequency, paymentNumber) >= date) return paymentNumber;
  }
  return undefined;
}
private static addInterval(date: Date, interval: RecurringPaymentInterval): void {
  if (interval === "weekly") date.setDate(date.getDate() + 7);
  else if (interval === "monthly") date.setMonth(date.getMonth() + 1);
  else if (interval === "semi-annually") date.setMonth(date.getMonth() + 6);
  else if (interval === "annually") date.setFullYear(date.getFullYear() + 1);
  else if (interval === "every-2-years") date.setFullYear(date.getFullYear() + 2);
  else if (interval === "every-3-years") date.setFullYear(date.getFullYear() + 3);
  else if (interval === "every-4-years") date.setFullYear(date.getFullYear() + 4);
  else date.setFullYear(date.getFullYear() + 5);
}
  }

  
