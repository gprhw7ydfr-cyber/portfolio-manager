import type { MortgageSummary } from "../../domain/mortgage/MortgageSummary";
import type { RepaymentFrequency } from "../../domain/mortgage/MortgageInput";
import { ResultCard } from "./ResultCard";

interface SummaryCardProps { result: MortgageSummary; frequency: RepaymentFrequency; }
const money = (value: number) => value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

export function SummaryCard({ result, frequency }: SummaryCardProps) {
  return (
    <section className="summary-card">
      <div className="summary-card__heading">
        <div><p className="eyebrow">Portfolio summary</p><h3>Your combined position</h3></div>
        <span className="split-count">{result.splits.length} {result.splits.length === 1 ? "split" : "splits"}</span>
      </div>
      <div className="summary-card__results">
        <ResultCard emphasis label={`${frequency[0].toUpperCase()}${frequency.slice(1)} repayments`} value={money(result.repayment)} supportingText="Across all splits" />
        <ResultCard label="Total interest" value={money(result.totalInterest)} />
        <ResultCard label="Total repaid" value={money(result.totalRepayment)} />
      </div>
    </section>
  );
}
