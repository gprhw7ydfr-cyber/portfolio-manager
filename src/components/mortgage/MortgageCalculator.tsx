import { useState } from "react";
import { MortgageEngine } from "../../engines/MortgageEngine";
import type { RepaymentFrequency } from "../../domain/mortgage/MortgageInput";
import type { MortgageSplit } from "../../domain/mortgage/MortgageSplit";
import { SplitCard } from "./SplitCard";
import { SummaryCard } from "./SummaryCard";

const createSplit = (name: string, values?: Partial<MortgageSplit>): MortgageSplit => ({
  id: crypto.randomUUID(),
  name,
  principal: 100000,
  annualInterestRate: 5.75,
  years: 30,
  ...values,
});

export default function MortgageCalculator() {
  const [frequency, setFrequency] =
    useState<RepaymentFrequency>("monthly");

  const [splits, setSplits] = useState<MortgageSplit[]>([
    createSplit("Main Mortgage", { principal: 500000 }),
  ]);

  const result = MortgageEngine.simulate({
    frequency,
    startDate: new Date(2026, 6, 25),
    splits,
  });

  const updateSplit = (id: string, changes: Partial<MortgageSplit>) => {
    setSplits((current) => current.map((split) =>
      split.id === id ? { ...split, ...changes } : split,
    ));
  };

  const duplicateSplit = (id: string) => {
    setSplits((current) => {
      const index = current.findIndex((split) => split.id === id);
      const source = current[index];
      if (!source) return current;
      const copy = createSplit(`${source.name} copy`, { ...source, id: crypto.randomUUID() });
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  };

  const moveSplit = (id: string, direction: -1 | 1) => {
    setSplits((current) => {
      const index = current.findIndex((split) => split.id === id);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  };

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
          value={frequency}
          onChange={(e) =>
            setFrequency(e.target.value as RepaymentFrequency)
          }
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </select>
        </label>
      </div>

      <div className="split-list">
        {splits.map((split, index) => (
          <SplitCard
            key={split.id}
            split={split}
            result={result.splits[index]}
            canDelete={splits.length > 1}
            canMoveUp={index > 0}
            canMoveDown={index < splits.length - 1}
            onChange={(changes) => updateSplit(split.id, changes)}
            onDelete={() => setSplits((current) => current.filter((item) => item.id !== split.id))}
            onDuplicate={() => duplicateSplit(split.id)}
            onMoveUp={() => moveSplit(split.id, -1)}
            onMoveDown={() => moveSplit(split.id, 1)}
          />
        ))}
      </div>

      <button className="button button--secondary" onClick={() => setSplits((current) => [
        ...current,
        createSplit(`Split ${current.length + 1}`),
      ])}>
        + Add another split
      </button>

      <SummaryCard result={result} frequency={frequency} />
    </section>
  );
}
