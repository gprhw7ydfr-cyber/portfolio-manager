import type { MortgageResult } from "../../domain/mortgage/MortgageResult";
import type { MortgageSplit } from "../../domain/mortgage/MortgageSplit";
import { InputRow } from "./InputRow";
import { ResultCard } from "./ResultCard";
import type { RecurringPayment, RecurringPaymentInterval } from "../../domain/mortgage/RecurringPayment";
import type { FixedRateSettings } from "../../domain/mortgage/FixedRateSettings";
import type { MortgageProductType, OffsetSettings, RevolvingCreditSettings, RevolvingCreditTransaction } from "../../domain/mortgage/MortgageProduct";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import type { CashAccount } from "../../domain/cash/CashAccount";

interface SplitCardProps {
  split: MortgageSplit;
  result: MortgageResult;
  canDelete: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  availableAccounts: CashAccount[];
  onChange: (changes: Partial<MortgageSplit>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const money = (value: number) => value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

const createPayment = (kind: RecurringPayment["kind"]): RecurringPayment => ({
  id: crypto.randomUUID(),
  kind,
  amount: kind === "extra" ? 50 : 1000,
  interval: kind === "extra" ? "weekly" : "semi-annually",
  startDate: today(),
});

const defaultFixedRateSettings: FixedRateSettings = {
  fixedRateTermMonths: 12,
  refixAnnualRate: 6.5,
  refixTermMonths: 12,
};
const defaultRevolvingCreditSettings: RevolvingCreditSettings = { creditLimit: 100000, transactions: [] };
const createRevolvingTransaction = (type: RevolvingCreditTransaction["type"]): RevolvingCreditTransaction => ({ id: crypto.randomUUID(), type, amount: 500, interval: "monthly", startDate: today() });

export function SplitCard({ split, result, canDelete, canMoveUp, canMoveDown, availableAccounts, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown }: SplitCardProps) {
  const payoffDate = result.schedule.at(-1)?.paymentDate;
  const payments = split.recurringPayments ?? [];
  const updatePayment = (id: string, changes: Partial<RecurringPayment>) => onChange({
    recurringPayments: payments.map((payment) => payment.id === id ? { ...payment, ...changes } : payment),
  });
  const offsetSettings: OffsetSettings = split.offsetSettings ?? { offsetBalance: 0 };
  const updateOffsetSettings = (changes: Partial<OffsetSettings>) => onChange({ offsetSettings: { ...offsetSettings, ...changes } });
  const linkedAccount = availableAccounts.find((account) => account.id === offsetSettings.linkedAccountId);
  const fixedSettings = split.fixedRateSettings ?? defaultFixedRateSettings;
  const updateFixedSettings = (changes: Partial<FixedRateSettings>) => onChange({
    fixedRateSettings: { ...fixedSettings, ...changes },
  });
  const revolvingSettings = split.revolvingCreditSettings ?? { ...defaultRevolvingCreditSettings, creditLimit: split.principal };
  const transactions = revolvingSettings.transactions ?? [];
  const updateRevolvingSettings = (changes: Partial<RevolvingCreditSettings>) => onChange({ revolvingCreditSettings: { ...revolvingSettings, ...changes } });
  const updateTransaction = (id: string, changes: Partial<RevolvingCreditTransaction>) => updateRevolvingSettings({ transactions: transactions.map((item) => item.id === id ? { ...item, ...changes } : item) });

  return (
    <article className="split-card">
      <div className="split-card__header">
        <div>
          <span className="split-card__label">Loan split</span>
          <input className="split-card__name" aria-label="Split name" value={split.name} onChange={(event) => onChange({ name: event.target.value })} />
        </div>
        <div className="split-card__actions" aria-label={`${split.name} actions`}>
          <button className="icon-button" title="Move up" disabled={!canMoveUp} onClick={onMoveUp}>↑</button>
          <button className="icon-button" title="Move down" disabled={!canMoveDown} onClick={onMoveDown}>↓</button>
          <button className="text-button" onClick={onDuplicate}>Duplicate</button>
          <button className="text-button text-button--danger" disabled={!canDelete} onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="split-card__body">
        <div className="input-grid">
          <InputRow label="Loan amount" value={split.principal} min={0} step={1000} prefix="$" onChange={(event) => onChange({ principal: numberFromInput(split.principal, event.target.value) })} />
          <InputRow label="Interest rate" value={split.annualInterestRate} min={0} step={0.01} suffix="% p.a." onChange={(event) => onChange({ annualInterestRate: numberFromInput(split.annualInterestRate, event.target.value) })} />
          <InputRow label="Loan term" value={split.years} min={1} suffix="years" onChange={(event) => onChange({ years: numberFromInput(split.years, event.target.value) })} />
        </div>
        <div className="split-results">
          <ResultCard label="Regular repayment" value={money(result.repayment)} />
          <ResultCard label="Total interest" value={money(result.totalInterest)} />
          <ResultCard
            label={split.productType === "revolving-credit" ? "Forecast balance" : "Estimated payoff"}
            value={split.productType === "revolving-credit"
              ? money(result.schedule.at(-1)?.closingBalance ?? split.principal)
              : payoffDate ? payoffDate.toLocaleDateString("en-NZ", { month: "short", year: "numeric" }) : "—"}
          />
        </div>
      </div>
      <div className="product-plan">
        <div className="product-plan__heading">
          <div><span className="split-card__label">Mortgage product</span><h4>How this split works</h4></div>
          <label className="rate-type"><span>Product</span><select value={split.productType ?? "principal-and-interest"} onChange={(event) => onChange({ productType: event.target.value as MortgageProductType })}><option value="principal-and-interest">Principal &amp; interest</option><option value="offset">Offset mortgage</option><option value="revolving-credit">Revolving credit</option></select></label>
        </div>
        {split.productType === "offset" && <div className="offset-settings">
          <div className="product-settings">
            {linkedAccount ? (
              <div className="offset-linked">
                <span>Linked account</span>
                <strong>{linkedAccount.name}</strong>
                <span className="muted">{money(linkedAccount.currentValue)}</span>
                <button className="text-button" onClick={() => updateOffsetSettings({ linkedAccountId: undefined })}>Unlink</button>
              </div>
            ) : (
              <>
                <label>
                  <span>Linked offset balance</span>
                  <span className="inline-control"><b>$</b><input type="number" min="0" step="1000" value={offsetSettings.offsetBalance} onFocus={selectIfZero(offsetSettings.offsetBalance)} onChange={(event) => updateOffsetSettings({ offsetBalance: numberFromInput(offsetSettings.offsetBalance, event.target.value) })} /></span>
                </label>
                {availableAccounts.length > 0 && (
                  <label className="rate-type">
                    <span>Or link a cash account</span>
                    <select defaultValue="" onChange={(event) => { if (event.target.value) updateOffsetSettings({ linkedAccountId: event.target.value }); }}>
                      <option value="" disabled>Choose an account&hellip;</option>
                      {availableAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}
            <p>Your interest is calculated only on the loan balance above this amount.</p>
          </div>
          <label className="offset-topup"><input type="checkbox" checked={offsetSettings.maintainLoanBalanceAtRefix ?? false} onChange={(event) => updateOffsetSettings({ maintainLoanBalanceAtRefix: event.target.checked, refixLoanBalanceTarget: offsetSettings.refixLoanBalanceTarget ?? split.principal })} /><span>Transfer principal into this offset loan whenever a fixed split refixes.</span></label>
          {offsetSettings.maintainLoanBalanceAtRefix && <label className="offset-target"><span>Offset loan balance at refix</span><span className="inline-control"><b>$</b><input type="number" min="0" step="1000" value={offsetSettings.refixLoanBalanceTarget ?? 0} onFocus={selectIfZero(offsetSettings.refixLoanBalanceTarget ?? 0)} onChange={(event) => updateOffsetSettings({ refixLoanBalanceTarget: numberFromInput(offsetSettings.refixLoanBalanceTarget ?? 0, event.target.value) })} /></span></label>}
        </div>}
        {split.productType === "revolving-credit" && <div className="revolving-settings"><div className="product-settings"><label><span>Credit limit</span><span className="inline-control"><b>$</b><input type="number" min="0" step="1000" value={revolvingSettings.creditLimit} onFocus={(event) => { if (revolvingSettings.creditLimit === 0) event.currentTarget.select(); }} onChange={(event) => updateRevolvingSettings({ creditLimit: numberFromInput(revolvingSettings.creditLimit, event.target.value) })} /></span></label><p>Interest is serviced each repayment period. Deposits reduce the drawn balance; withdrawals increase it, up to the limit.</p></div><div className="revolving-actions"><button className="text-button" onClick={() => updateRevolvingSettings({ transactions: [...transactions, createRevolvingTransaction("deposit")] })}>+ Deposit</button><button className="text-button" onClick={() => updateRevolvingSettings({ transactions: [...transactions, createRevolvingTransaction("withdrawal")] })}>+ Withdrawal</button></div>{transactions.map((transaction) => <div className="payment-rule" key={transaction.id}><strong>{transaction.type === "deposit" ? "Deposit" : "Withdrawal"}</strong><label><span>Amount</span><span className="inline-control"><b>$</b><input type="number" min="0" value={transaction.amount} onFocus={(event) => { if (transaction.amount === 0) event.currentTarget.select(); }} onChange={(event) => updateTransaction(transaction.id, { amount: numberFromInput(transaction.amount, event.target.value) })} /></span></label><label><span>Repeats</span><select value={transaction.interval} onChange={(event) => updateTransaction(transaction.id, { interval: event.target.value as RevolvingCreditTransaction["interval"] })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label><span>First transaction</span><input type="date" value={transaction.startDate} onChange={(event) => updateTransaction(transaction.id, { startDate: event.target.value })} /></label><button className="icon-button payment-rule__delete" title="Remove transaction" onClick={() => updateRevolvingSettings({ transactions: transactions.filter((item) => item.id !== transaction.id) })}>×</button></div>)}</div>}
      </div>
      <div className="rate-plan">
        <div className="rate-plan__heading">
          <div><span className="split-card__label">Rate strategy</span><h4>Interest-rate settings</h4></div>
          <label className="rate-type"><span>Loan type</span><select value={split.rateType ?? "floating"} onChange={(event) => onChange({
            rateType: event.target.value as MortgageSplit["rateType"],
            fixedRateSettings: event.target.value === "fixed" ? fixedSettings : split.fixedRateSettings,
          })}><option value="floating">Floating</option><option value="fixed">Fixed</option></select></label>
        </div>
        {split.rateType === "fixed" ? (
          <div className="rate-settings">
            <label><span>Initial fixed term</span><span className="inline-control"><input aria-label="Initial fixed term in months" type="number" min="1" value={fixedSettings.fixedRateTermMonths} onFocus={(event) => { if (fixedSettings.fixedRateTermMonths === 0) event.currentTarget.select(); }} onChange={(event) => updateFixedSettings({ fixedRateTermMonths: numberFromInput(fixedSettings.fixedRateTermMonths, event.target.value) })} /><b>months</b></span></label>
            <label><span>Assumed refix rate</span><span className="inline-control"><input aria-label="Assumed refix rate" type="number" min="0" step="0.01" value={fixedSettings.refixAnnualRate} onFocus={(event) => { if (fixedSettings.refixAnnualRate === 0) event.currentTarget.select(); }} onChange={(event) => updateFixedSettings({ refixAnnualRate: numberFromInput(fixedSettings.refixAnnualRate, event.target.value) })} /><b>% p.a.</b></span></label>
            <label><span>Refix term</span><span className="inline-control"><input aria-label="Refix term in months" type="number" min="1" value={fixedSettings.refixTermMonths} onFocus={(event) => { if (fixedSettings.refixTermMonths === 0) event.currentTarget.select(); }} onChange={(event) => updateFixedSettings({ refixTermMonths: numberFromInput(fixedSettings.refixTermMonths, event.target.value) })} /><b>months</b></span></label>
          </div>
        ) : <p className="rate-plan__help">Floating loans retain the current rate until a rate-change event is added.</p>}
      </div>
      <div className="payment-plan">
        <div className="payment-plan__heading">
          <div><span className="split-card__label">Payment plan</span><h4>Extra and lump-sum payments</h4></div>
          <div className="payment-plan__buttons">
            <button className="text-button" onClick={() => onChange({ recurringPayments: [...payments, createPayment("extra")] })}>+ Extra payment</button>
            <button className="text-button" onClick={() => onChange({ recurringPayments: [...payments, createPayment("lump-sum")] })}>+ Lump sum</button>
          </div>
        </div>
        {payments.length === 0 ? <p className="payment-plan__empty">No additional payments scheduled.</p> : (
          <div className="payment-rules">
            {payments.map((payment) => (
              <div className="payment-rule" key={payment.id}>
                <strong>{payment.kind === "extra" ? "Extra payment" : "Lump sum"}</strong>
                <label><span>Amount</span><span className="inline-control"><b>$</b><input aria-label="Payment amount" type="number" min="0" step="50" value={payment.amount} onFocus={(event) => { if (payment.amount === 0) event.currentTarget.select(); }} onChange={(event) => updatePayment(payment.id, { amount: numberFromInput(payment.amount, event.target.value) })} /></span></label>
                <label><span>Repeats</span><select aria-label="Payment interval" value={payment.interval} onChange={(event) => updatePayment(payment.id, { interval: event.target.value as RecurringPaymentInterval })}>
                  {(payment.kind === "extra" ? ["weekly", "monthly"] : ["semi-annually", "annually", "every-2-years", "every-3-years", "every-4-years", "every-5-years"]).map((interval) => <option key={interval} value={interval}>{interval === "weekly" ? "Weekly" : interval === "monthly" ? "Monthly" : interval === "semi-annually" ? "Every 6 months" : interval === "annually" ? "Every 1 year" : `Every ${interval.match(/\d/)} years`}</option>)}
                </select></label>
                <label><span>First payment</span><input aria-label="First payment date" type="date" value={payment.startDate} onChange={(event) => updatePayment(payment.id, { startDate: event.target.value })} /></label>
                <button className="icon-button payment-rule__delete" title="Remove payment" onClick={() => onChange({ recurringPayments: payments.filter((item) => item.id !== payment.id) })}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
