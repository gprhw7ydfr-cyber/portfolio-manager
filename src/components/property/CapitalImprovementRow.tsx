import type { CapitalImprovement } from "../../domain/property/PropertyAsset";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";

interface CapitalImprovementRowProps {
  improvement: CapitalImprovement;
  onChange: (changes: Partial<CapitalImprovement>) => void;
  onDelete: () => void;
}

export function CapitalImprovementRow({ improvement, onChange, onDelete }: CapitalImprovementRowProps) {
  return (
    <div className="payment-rule">
      <label>
        <span>Description</span>
        <input
          aria-label="Improvement description"
          type="text"
          value={improvement.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
      <label>
        <span>Cost</span>
        <span className="inline-control">
          <b>$</b>
          <input
            aria-label="Improvement cost"
            type="number"
            min="0"
            step="500"
            value={improvement.cost}
            onFocus={selectIfZero(improvement.cost)}
            onChange={(event) => onChange({ cost: numberFromInput(improvement.cost, event.target.value) })}
          />
        </span>
      </label>
      <label>
        <span>Date</span>
        <input
          aria-label="Improvement date"
          type="date"
          value={improvement.date}
          onChange={(event) => onChange({ date: event.target.value })}
        />
      </label>
      <label>
        <span>Expected value increase</span>
        <span className="inline-control">
          <b>$</b>
          <input
            aria-label="Expected value increase"
            type="number"
            min="0"
            step="500"
            value={improvement.expectedValueIncrease ?? 0}
            onFocus={selectIfZero(improvement.expectedValueIncrease ?? 0)}
            onChange={(event) => onChange({ expectedValueIncrease: numberFromInput(improvement.expectedValueIncrease ?? 0, event.target.value) })}
          />
        </span>
      </label>
      <button className="icon-button payment-rule__delete" title="Remove improvement" onClick={onDelete}>×</button>
    </div>
  );
}
