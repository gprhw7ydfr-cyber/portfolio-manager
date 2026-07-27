import type { StrategyEvent, StrategyEventChanges } from "../../domain/scenario/StrategyEvent";
import type { RecurringPaymentInterval } from "../../domain/mortgage/RecurringPayment";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";

export interface NamedOption {
  id: string;
  label: string;
}

interface StrategyEventRowProps {
  event: StrategyEvent;
  availableProperties: NamedOption[];
  availableSplits: NamedOption[];
  onChange: (changes: StrategyEventChanges) => void;
  onDelete: () => void;
}

const TYPE_LABEL: Record<StrategyEvent["type"], string> = {
  "buy-property": "Buy property",
  "sell-property": "Sell property",
  renovate: "Renovate",
  "increase-repayments": "Increase repayments",
  refinance: "Refinance",
};

const INTERVAL_OPTIONS: RecurringPaymentInterval[] = ["weekly", "monthly"];

export function StrategyEventRow({ event, availableProperties, availableSplits, onChange, onDelete }: StrategyEventRowProps) {
  return (
    <div className="payment-rule strategy-event-row">
      <strong>{TYPE_LABEL[event.type]}</strong>

      <label>
        <span>Year</span>
        <span className="inline-control">
          <input
            aria-label="Event year"
            type="number"
            min="0"
            value={event.year}
            onFocus={selectIfZero(event.year)}
            onChange={(inputEvent) => onChange({ year: numberFromInput(event.year, inputEvent.target.value) })}
          />
          <b>years from now</b>
        </span>
      </label>

      {event.type === "buy-property" && (
        <>
          <label><span>Property name</span><input value={event.propertyName} onChange={(inputEvent) => onChange({ propertyName: inputEvent.target.value })} /></label>
          <label><span>Purchase price</span><span className="inline-control"><b>$</b><input type="number" min="0" step="1000" value={event.price} onFocus={selectIfZero(event.price)} onChange={(inputEvent) => onChange({ price: numberFromInput(event.price, inputEvent.target.value) })} /></span></label>
          <label><span>Deposit</span><span className="inline-control"><b>$</b><input type="number" min="0" step="1000" value={event.deposit} onFocus={selectIfZero(event.deposit)} onChange={(inputEvent) => onChange({ deposit: numberFromInput(event.deposit, inputEvent.target.value) })} /></span></label>
          <label><span>Interest rate</span><span className="inline-control"><input type="number" min="0" step="0.01" value={event.annualInterestRate} onFocus={selectIfZero(event.annualInterestRate)} onChange={(inputEvent) => onChange({ annualInterestRate: numberFromInput(event.annualInterestRate, inputEvent.target.value) })} /><b>% p.a.</b></span></label>
          <label><span>Loan term</span><span className="inline-control"><input type="number" min="1" value={event.years} onChange={(inputEvent) => onChange({ years: numberFromInput(event.years, inputEvent.target.value) })} /><b>years</b></span></label>
          <label><span>Starting rent</span><span className="inline-control"><b>$</b><input type="number" min="0" step="10" value={event.rentPerWeek} onFocus={selectIfZero(event.rentPerWeek)} onChange={(inputEvent) => onChange({ rentPerWeek: numberFromInput(event.rentPerWeek, inputEvent.target.value) })} /><b>/week</b></span></label>
        </>
      )}

      {event.type === "sell-property" && (
        <>
          <label>
            <span>Property</span>
            <select value={event.propertyId} onChange={(inputEvent) => onChange({ propertyId: inputEvent.target.value })}>
              {availableProperties.map((property) => <option key={property.id} value={property.id}>{property.label}</option>)}
            </select>
          </label>
          <label><span>Selling costs</span><span className="inline-control"><input type="number" min="0" step="0.5" value={event.sellingCostsPercentage} onFocus={selectIfZero(event.sellingCostsPercentage)} onChange={(inputEvent) => onChange({ sellingCostsPercentage: numberFromInput(event.sellingCostsPercentage, inputEvent.target.value) })} /><b>% of sale price</b></span></label>
        </>
      )}

      {event.type === "renovate" && (
        <>
          <label>
            <span>Property</span>
            <select value={event.propertyId} onChange={(inputEvent) => onChange({ propertyId: inputEvent.target.value })}>
              {availableProperties.map((property) => <option key={property.id} value={property.id}>{property.label}</option>)}
            </select>
          </label>
          <label><span>Cost</span><span className="inline-control"><b>$</b><input type="number" min="0" step="1000" value={event.cost} onFocus={selectIfZero(event.cost)} onChange={(inputEvent) => onChange({ cost: numberFromInput(event.cost, inputEvent.target.value) })} /></span></label>
          <label><span>Expected value increase</span><span className="inline-control"><b>$</b><input type="number" min="0" step="1000" value={event.expectedValueIncrease} onFocus={selectIfZero(event.expectedValueIncrease)} onChange={(inputEvent) => onChange({ expectedValueIncrease: numberFromInput(event.expectedValueIncrease, inputEvent.target.value) })} /></span></label>
        </>
      )}

      {event.type === "increase-repayments" && (
        <>
          <label>
            <span>Split</span>
            <select value={event.splitId} onChange={(inputEvent) => onChange({ splitId: inputEvent.target.value })}>
              {availableSplits.map((split) => <option key={split.id} value={split.id}>{split.label}</option>)}
            </select>
          </label>
          <label><span>Extra amount</span><span className="inline-control"><b>$</b><input type="number" min="0" step="10" value={event.amount} onFocus={selectIfZero(event.amount)} onChange={(inputEvent) => onChange({ amount: numberFromInput(event.amount, inputEvent.target.value) })} /></span></label>
          <label>
            <span>Repeats</span>
            <select value={event.interval} onChange={(inputEvent) => onChange({ interval: inputEvent.target.value as RecurringPaymentInterval })}>
              {INTERVAL_OPTIONS.map((interval) => <option key={interval} value={interval}>{interval === "weekly" ? "Weekly" : "Monthly"}</option>)}
            </select>
          </label>
        </>
      )}

      {event.type === "refinance" && (
        <>
          <label>
            <span>Split</span>
            <select value={event.splitId} onChange={(inputEvent) => onChange({ splitId: inputEvent.target.value })}>
              {availableSplits.map((split) => <option key={split.id} value={split.id}>{split.label}</option>)}
            </select>
          </label>
          <label><span>New interest rate</span><span className="inline-control"><input type="number" min="0" step="0.01" value={event.annualInterestRate} onFocus={selectIfZero(event.annualInterestRate)} onChange={(inputEvent) => onChange({ annualInterestRate: numberFromInput(event.annualInterestRate, inputEvent.target.value) })} /><b>% p.a.</b></span></label>
        </>
      )}

      <button className="icon-button payment-rule__delete" title="Remove event" onClick={onDelete}>×</button>
    </div>
  );
}
