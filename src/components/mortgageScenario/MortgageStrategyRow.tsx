import type { MortgageSplit } from "../../domain/mortgage/MortgageSplit";
import type { MortgageStrategy, MortgageStrategyExtraPayment, MortgageStrategySplitOverride } from "../../domain/mortgage/MortgageStrategy";
import type { ExtraPaymentMode } from "../../domain/mortgage/recommendExtraPayment";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";

interface MortgageStrategyRowProps {
  strategy: MortgageStrategy;
  splits: MortgageSplit[];
  onChange: (changes: Partial<MortgageStrategy>) => void;
  onDelete: () => void;
}

const EXTRA_PAYMENT_MODES: { value: ExtraPaymentMode; label: string }[] = [
  { value: "lump-sum", label: "One-off lump sum" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function MortgageStrategyRow({ strategy, splits, onChange, onDelete }: MortgageStrategyRowProps) {
  const extraPayments = strategy.extraPayments ?? [];
  const splitOverrides = strategy.splitOverrides ?? {};
  const overriddenSplitIds = Object.keys(splitOverrides);
  const availableForOverride = splits.filter((split) => !overriddenSplitIds.includes(split.id));

  const addExtraPayment = () => {
    if (splits.length === 0) return;
    const payment: MortgageStrategyExtraPayment = { id: crypto.randomUUID(), splitId: splits[0].id, amount: 50, mode: "weekly" };
    onChange({ extraPayments: [...extraPayments, payment] });
  };
  const updateExtraPayment = (id: string, changes: Partial<MortgageStrategyExtraPayment>) => {
    onChange({ extraPayments: extraPayments.map((payment) => (payment.id === id ? { ...payment, ...changes } : payment)) });
  };
  const deleteExtraPayment = (id: string) => {
    onChange({ extraPayments: extraPayments.filter((payment) => payment.id !== id) });
  };

  const addSplitOverride = (splitId: string) => {
    onChange({ splitOverrides: { ...splitOverrides, [splitId]: {} } });
  };
  const updateSplitOverride = (splitId: string, changes: Partial<MortgageStrategySplitOverride>) => {
    onChange({ splitOverrides: { ...splitOverrides, [splitId]: { ...splitOverrides[splitId], ...changes } } });
  };
  const deleteSplitOverride = (splitId: string) => {
    const rest = { ...splitOverrides };
    delete rest[splitId];
    onChange({ splitOverrides: rest });
  };

  return (
    <article className="split-card mortgage-strategy-row">
      <div className="split-card__header">
        <div>
          <span className="split-card__label">Strategy</span>
          <input className="split-card__name" aria-label="Strategy name" value={strategy.name} onChange={(event) => onChange({ name: event.target.value })} />
        </div>
        <button className="text-button text-button--danger" onClick={onDelete}>Delete</button>
      </div>

      <div className="product-plan">
        <div className="product-plan__heading">
          <div><span className="split-card__label">Extra payments</span><h4>Where should money go?</h4></div>
          <button className="text-button" disabled={splits.length === 0} onClick={addExtraPayment}>+ Extra payment</button>
        </div>
        {extraPayments.length === 0 ? <p className="payment-plan__empty">No extra payments in this strategy.</p> : (
          <div className="payment-rules">
            {extraPayments.map((payment) => (
              <div className="payment-rule" key={payment.id}>
                <strong>Extra payment</strong>
                <label>
                  <span>Split</span>
                  <select value={payment.splitId} onChange={(event) => updateExtraPayment(payment.id, { splitId: event.target.value })}>
                    {splits.map((split) => <option key={split.id} value={split.id}>{split.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Amount</span>
                  <span className="inline-control">
                    <b>$</b>
                    <input type="number" min="0" step="10" value={payment.amount} onFocus={selectIfZero(payment.amount)} onChange={(event) => updateExtraPayment(payment.id, { amount: numberFromInput(payment.amount, event.target.value) })} />
                  </span>
                </label>
                <label>
                  <span>Mode</span>
                  <select value={payment.mode} onChange={(event) => updateExtraPayment(payment.id, { mode: event.target.value as ExtraPaymentMode })}>
                    {EXTRA_PAYMENT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
                  </select>
                </label>
                <button className="icon-button payment-rule__delete" title="Remove extra payment" onClick={() => deleteExtraPayment(payment.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="product-plan">
        <div className="product-plan__heading">
          <div><span className="split-card__label">Rate &amp; refix overrides</span><h4>Different assumptions for a split</h4></div>
          {availableForOverride.length > 0 && (
            <select defaultValue="" onChange={(event) => { if (event.target.value) addSplitOverride(event.target.value); }}>
              <option value="" disabled>+ Override a split&hellip;</option>
              {availableForOverride.map((split) => <option key={split.id} value={split.id}>{split.name}</option>)}
            </select>
          )}
        </div>
        {overriddenSplitIds.length === 0 ? <p className="payment-plan__empty">No rate or refix overrides in this strategy.</p> : (
          <div className="payment-rules">
            {overriddenSplitIds.map((splitId) => {
              const split = splits.find((candidate) => candidate.id === splitId);
              const override = splitOverrides[splitId];
              return (
                <div className="payment-rule" key={splitId}>
                  <strong>{split?.name ?? "Removed split"}</strong>
                  <label>
                    <span>Interest rate</span>
                    <span className="inline-control">
                      <input
                        type="number" min="0" step="0.01"
                        value={override.annualInterestRate ?? split?.annualInterestRate ?? 0}
                        onChange={(event) => updateSplitOverride(splitId, { annualInterestRate: numberFromInput(override.annualInterestRate ?? 0, event.target.value) })}
                      />
                      <b>% p.a.</b>
                    </span>
                  </label>
                  <label>
                    <span>Assumed refix rate</span>
                    <span className="inline-control">
                      <input
                        type="number" min="0" step="0.01"
                        value={override.fixedRateSettings?.refixAnnualRate ?? split?.fixedRateSettings?.refixAnnualRate ?? 0}
                        onChange={(event) => updateSplitOverride(splitId, {
                          fixedRateSettings: { ...override.fixedRateSettings, refixAnnualRate: numberFromInput(override.fixedRateSettings?.refixAnnualRate ?? 0, event.target.value) },
                        })}
                      />
                      <b>% p.a.</b>
                    </span>
                  </label>
                  <button className="icon-button payment-rule__delete" title="Remove override" onClick={() => deleteSplitOverride(splitId)}>×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
