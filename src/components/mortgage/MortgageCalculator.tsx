import { useMemo } from "react";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { toMortgageInput } from "../../domain/mortgage/toMortgageInput";
import { createDefaultSplit } from "../../domain/mortgage/createDefaultSplit";
import type { RepaymentFrequency } from "../../domain/mortgage/MortgageInput";
import type { MortgageSplit } from "../../domain/mortgage/MortgageSplit";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import { usePortfolio } from "../../store/usePortfolio";
import { SplitCard } from "./SplitCard";
import { SummaryCard } from "./SummaryCard";

export default function MortgageCalculator() {
  const [portfolio, setPortfolio] = usePortfolio();

  const mortgage = portfolio.liabilities.find(
    (liability): liability is MortgageLiability => liability.type === "mortgage",
  );

  const result = useMemo(
    () => (mortgage ? MortgageEngine.simulate(toMortgageInput(mortgage)) : undefined),
    [mortgage],
  );

  const updateMortgage = (changes: Partial<MortgageLiability>) => {
    setPortfolio((current) => ({
      ...current,
      liabilities: current.liabilities.map((liability) =>
        liability.type === "mortgage" && liability.id === mortgage?.id
          ? { ...liability, ...changes }
          : liability,
      ),
    }));
  };

  const updateSplits = (updater: (splits: MortgageSplit[]) => MortgageSplit[]) => {
    setPortfolio((current) => ({
      ...current,
      liabilities: current.liabilities.map((liability) =>
        liability.type === "mortgage" && liability.id === mortgage?.id
          ? { ...liability, splits: updater(liability.splits) }
          : liability,
      ),
    }));
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

  if (!mortgage || !result) {
    return null;
  }

  return (
    <section className="calculator">
      <div className="calculator__heading">
        <div>
          <p className="eyebrow">Mortgage portfolio</p>
          <h2>Plan your lending, split by split.</h2>
          <p className="muted">Adjust each loan independently and see the combined position below.</p>
        </div>
        <label className="frequency-control">
          <span>Repayment frequency</span>
        <select
          value={mortgage.frequency}
          onChange={(e) =>
            updateMortgage({ frequency: e.target.value as RepaymentFrequency })
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
    </section>
  );
}
