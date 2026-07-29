import type { MortgageSummary } from "../../domain/mortgage/MortgageSummary";
import type { RepaymentFrequency } from "../../domain/mortgage/MortgageInput";
import type { AmortizationPayment } from "../../domain/mortgage/AmortizationPayment";
import { remainingTotalsAsOf } from "../../domain/mortgage/scheduleAsOf";
import { ResultCard } from "./ResultCard";

interface SummaryCardProps { result: MortgageSummary; frequency: RepaymentFrequency; combinedSchedule: AmortizationPayment[]; }
const money = (value: number) => value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

/** "Total interest to pay" / "Total principal and interest to pay" are what's still left to pay
 *  from today onward, not the full lifetime total (which would also count payments already
 *  made) — computed fresh from the real wall-clock date on every render, so they genuinely
 *  shrink as real time passes and scheduled payments fall into the past, not just when the
 *  loan's own terms are edited. */
export function SummaryCard({ result, frequency, combinedSchedule }: SummaryCardProps) {
  const remaining = remainingTotalsAsOf(combinedSchedule, new Date());
  return (
    <section className="summary-card">
      <div className="summary-card__heading">
        <div><p className="eyebrow">Loan summary</p><h3>Your combined position</h3></div>
        <span className="split-count">{result.splits.length} {result.splits.length === 1 ? "split" : "splits"}</span>
      </div>
      <div className="summary-card__results">
        <ResultCard emphasis label={`${frequency[0].toUpperCase()}${frequency.slice(1)} repayments`} value={money(result.repayment)} supportingText="Across all splits" />
        <ResultCard label="Total interest to pay" value={money(remaining.interest)} supportingText="Remaining, from today" />
        <ResultCard label="Total principal and interest to pay" value={money(remaining.repayment)} supportingText="Remaining, from today" />
        <ResultCard
          label="Loan completion date"
          value={result.payoffDate ? result.payoffDate.toLocaleDateString("en-NZ", { month: "short", year: "numeric" }) : "—"}
        />
      </div>
    </section>
  );
}
