import { useMemo } from "react";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { toMortgageInput } from "../../domain/mortgage/toMortgageInput";
import { createDefaultSplit } from "../../domain/mortgage/createDefaultSplit";
import type { RepaymentFrequency } from "../../domain/mortgage/MortgageInput";
import type { MortgageSplit } from "../../domain/mortgage/MortgageSplit";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import type { CashAccount } from "../../domain/cash/CashAccount";
import { SplitCard } from "./SplitCard";
import { SummaryCard } from "./SummaryCard";
import { ExtraPaymentAdvisor } from "./ExtraPaymentAdvisor";
import { AmortizationDetail } from "./AmortizationDetail";
import { combineSchedules } from "../../domain/mortgage/amortizationDetail";

interface MortgagePanelProps {
  mortgage: MortgageLiability;
  cashAccounts: CashAccount[];
  onChange: (changes: Partial<MortgageLiability>) => void;
  title?: string;
  subtitle?: string;
}

export function MortgagePanel({
  mortgage,
  cashAccounts,
  onChange,
  title = "Plan your lending, split by split.",
  subtitle = "Adjust each loan independently and see the combined position below.",
}: MortgagePanelProps) {
  const result = useMemo(
    () => MortgageEngine.simulate(toMortgageInput(mortgage, cashAccounts)),
    [mortgage, cashAccounts],
  );
  const combinedSchedule = useMemo(
    () => combineSchedules(result.splits.map((split) => split.schedule)),
    [result],
  );

  const updateSplits = (updater: (splits: MortgageSplit[]) => MortgageSplit[]) => {
    onChange({ splits: updater(mortgage.splits) });
  };

  const updateSplit = (id: string, changes: Partial<MortgageSplit>) => {
    updateSplits((splits) => splits.map((split) =>
      split.id === id ? { ...split, ...changes } : split,
    ));
  };

  const duplicateSplit = (id: string) => {
    updateSplits((splits) => {
      const index = splits.findIndex((split) => split.id === id);
      const source = splits[index];
      if (!source) return splits;
      const copy = createDefaultSplit(`${source.name} copy`, source);
      return [...splits.slice(0, index + 1), copy, ...splits.slice(index + 1)];
    });
  };

  const moveSplit = (id: string, direction: -1 | 1) => {
    updateSplits((splits) => {
      const index = splits.findIndex((split) => split.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= splits.length) return splits;
      const reordered = [...splits];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  };

  return (
    <section className="calculator">
      <div className="calculator__heading">
        <div>
          <p className="eyebrow">{mortgage.name}</p>
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
        </div>
        <label className="frequency-control">
          <span>Repayment frequency</span>
        <select
          value={mortgage.frequency}
          onChange={(e) =>
            onChange({ frequency: e.target.value as RepaymentFrequency })
          }
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </select>
        </label>
      </div>

      <div className="split-list">
        {mortgage.splits.map((split, index) => (
          <SplitCard
            key={split.id}
            split={split}
            result={result.splits[index]}
            canDelete={mortgage.splits.length > 1}
            canMoveUp={index > 0}
            canMoveDown={index < mortgage.splits.length - 1}
            availableAccounts={cashAccounts}
            onChange={(changes) => updateSplit(split.id, changes)}
            onDelete={() => updateSplits((splits) => splits.filter((item) => item.id !== split.id))}
            onDuplicate={() => duplicateSplit(split.id)}
            onMoveUp={() => moveSplit(split.id, -1)}
            onMoveDown={() => moveSplit(split.id, 1)}
          />
        ))}
      </div>

      <button className="button button--secondary" onClick={() => updateSplits((splits) => [
        ...splits,
        createDefaultSplit(`Split ${splits.length + 1}`),
      ])}>
        + Add another split
      </button>

      <SummaryCard result={result} frequency={mortgage.frequency} />

      <AmortizationDetail schedule={combinedSchedule} label="Combined mortgage" />

      <ExtraPaymentAdvisor mortgage={mortgage} assets={cashAccounts} />
    </section>
  );
}
