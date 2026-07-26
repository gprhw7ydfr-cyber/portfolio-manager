import type { CashAccount, CashAccountType } from "../../domain/cash/CashAccount";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";

interface CashAccountCardProps {
  account: CashAccount;
  onChange: (changes: Partial<CashAccount>) => void;
  onDelete: () => void;
}

const typeLabel: Record<CashAccountType, string> = {
  everyday: "Everyday",
  savings: "Savings",
  "term-deposit": "Term deposit",
};

export function CashAccountCard({ account, onChange, onDelete }: CashAccountCardProps) {
  return (
    <article className="split-card">
      <div className="split-card__header">
        <div>
          <span className="split-card__label">{typeLabel[account.type]}</span>
          <input className="split-card__name" aria-label="Account name" value={account.name} onChange={(event) => onChange({ name: event.target.value })} />
        </div>
        <div className="split-card__actions" aria-label={`${account.name} actions`}>
          <button className="text-button text-button--danger" onClick={onDelete}>Delete</button>
        </div>
      </div>

      <div className="split-card__body cash-account-body">
        <label className="input-row">
          <span>Account type</span>
          <span className="input-row__control">
            <select value={account.type} onChange={(event) => onChange({ type: event.target.value as CashAccountType })}>
              <option value="everyday">Everyday</option>
              <option value="savings">Savings</option>
              <option value="term-deposit">Term deposit</option>
            </select>
          </span>
        </label>
        <label className="input-row">
          <span>Balance</span>
          <span className="input-row__control">
            <b className="input-row__adornment">$</b>
            <input type="number" min="0" step="100" value={account.currentValue} onFocus={selectIfZero(account.currentValue)} onChange={(event) => onChange({ currentValue: numberFromInput(account.currentValue, event.target.value) })} />
          </span>
        </label>
        <label className="input-row">
          <span>Interest rate</span>
          <span className="input-row__control">
            <input type="number" min="0" step="0.1" value={account.interestRate ?? 0} onFocus={selectIfZero(account.interestRate ?? 0)} onChange={(event) => onChange({ interestRate: numberFromInput(account.interestRate ?? 0, event.target.value) })} />
            <span className="input-row__adornment">% p.a.</span>
          </span>
        </label>
        {account.type === "term-deposit" && (
          <label className="input-row">
            <span>Maturity date</span>
            <span className="input-row__control">
              <input type="date" value={account.maturityDate ?? ""} onChange={(event) => onChange({ maturityDate: event.target.value })} />
            </span>
          </label>
        )}
      </div>
    </article>
  );
}
