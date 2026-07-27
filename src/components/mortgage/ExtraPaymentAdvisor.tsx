import { useMemo, useState } from "react";
import { recommendExtraPayment } from "../../domain/mortgage/recommendExtraPayment";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import type { Asset } from "../../domain/asset/Asset";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import { formatMoney } from "../../domain/shared/formatMoney";

interface ExtraPaymentAdvisorProps {
  mortgage: MortgageLiability;
  assets: Asset[];
}

const DEFAULT_TEST_AMOUNT = 5000;

export function ExtraPaymentAdvisor({ mortgage, assets }: ExtraPaymentAdvisorProps) {
  const [amount, setAmount] = useState(DEFAULT_TEST_AMOUNT);

  const analysis = useMemo(
    () => recommendExtraPayment(mortgage, assets, amount),
    [mortgage, assets, amount],
  );

  if (analysis.options.length < 2) {
    return null;
  }

  return (
    <div className="property-section extra-payment-advisor">
      <div className="property-section__heading">
        <div>
          <span className="split-card__label">Extra payment advisor</span>
          <h4>Where should extra money go?</h4>
        </div>
      </div>
      <p className="muted">Compares putting a one-off lump sum toward each split by re-running the real simulation — offset, redistribution, and refixing all included, not a rate estimate.</p>
      <label className="offset-target">
        <span>Extra amount</span>
        <span className="inline-control">
          <b>$</b>
          <input type="number" min="0" step="500" value={amount} onFocus={selectIfZero(amount)} onChange={(event) => setAmount(numberFromInput(amount, event.target.value))} />
        </span>
      </label>
      <table className="cash-flow-table">
        <thead>
          <tr><th>Split</th><th>Interest saved</th></tr>
        </thead>
        <tbody>
          {analysis.options.map((option, index) => (
            <tr key={option.splitId} className={index === 0 ? "cash-flow-table__net" : undefined}>
              <th>{option.splitName}{index === 0 ? " — Recommended" : ""}</th>
              <td>{formatMoney(option.interestSaved)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
