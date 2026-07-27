import { useState } from "react";
import { planExtraPaymentReallocation, type ReallocationInterval, type ReallocationPlan } from "../../domain/mortgage/planExtraPaymentReallocation";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import type { Asset } from "../../domain/asset/Asset";
import { annualSeriesForSchedule } from "../../domain/mortgage/annualSeries";
import { formatMoney } from "../../domain/shared/formatMoney";
import { MultiSeriesTrendChart } from "../scenario/MultiSeriesTrendChart";
import { CATEGORICAL } from "../dashboard/chartPalette";

interface ReallocationPlanPanelProps {
  mortgage: MortgageLiability;
  assets: Asset[];
  testAmount: number;
  interval: ReallocationInterval;
}

const formatDate = (date: Date) => date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

const REASON_LABEL: Record<ReallocationPlan["regimes"][number]["reason"], string> = {
  initial: "to start",
  payoff: "once the previous split is paid off",
  refix: "once a split refixes and the ranking changes",
};

function totalsFor(schedule: ReallocationPlan["combinedBaselineSchedule"]) {
  const totalInterest = schedule.reduce((sum, payment) => sum + payment.interest, 0);
  const totalRepayment = schedule.reduce((sum, payment) => sum + payment.repayment, 0);
  const last = schedule.at(-1);
  return { totalInterest, totalRepayment, payoffDate: last?.closingBalance === 0 ? last.paymentDate : undefined };
}

export function ReallocationPlanPanel({ mortgage, assets, testAmount, interval }: ReallocationPlanPanelProps) {
  const [plan, setPlan] = useState<ReallocationPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const runPlan = () => {
    setIsPlanning(true);
    setPlan(null);
    setTimeout(() => {
      setPlan(planExtraPaymentReallocation(mortgage, assets, testAmount, interval, new Date()));
      setIsPlanning(false);
    }, 0);
  };

  const baselineTotals = plan ? totalsFor(plan.combinedBaselineSchedule) : null;
  const withPlanTotals = plan ? totalsFor(plan.combinedWithPlanSchedule) : null;

  const chartSeries = plan ? {
    balance: [
      { label: "Baseline", color: CATEGORICAL.blue, points: annualSeriesForSchedule(plan.combinedBaselineSchedule).map((point) => ({ year: point.year, value: point.closingBalance })) },
      { label: "With reallocation plan", color: CATEGORICAL.orange, points: annualSeriesForSchedule(plan.combinedWithPlanSchedule).map((point) => ({ year: point.year, value: point.closingBalance })) },
    ],
    interest: [
      { label: "Baseline", color: CATEGORICAL.blue, points: annualSeriesForSchedule(plan.combinedBaselineSchedule).map((point) => ({ year: point.year, value: point.cumulativeInterest })) },
      { label: "With reallocation plan", color: CATEGORICAL.orange, points: annualSeriesForSchedule(plan.combinedWithPlanSchedule).map((point) => ({ year: point.year, value: point.cumulativeInterest })) },
    ],
  } : null;

  return (
    <div className="reallocation-plan">
      <div className="payment-plan__heading">
        <div>
          <span className="split-card__label">Life-of-loan reallocation</span>
          <h4>Should this money move over time?</h4>
        </div>
        <button className="button button--secondary" disabled={isPlanning} onClick={runPlan}>
          {isPlanning ? "Planning…" : "Plan my reallocation"}
        </button>
      </div>
      <p className="muted">Chains this recurring amount across splits (and any interest-bearing cash account) — switching whenever the current destination pays off or a split refixes and the ranking changes.</p>

      {plan && (
        <>
          <ol className="reallocation-timeline">
            {plan.regimes.map((regime, index) => (
              <li key={`${regime.destination.id}-${index}`}>
                <strong>From {formatDate(regime.startDate)}</strong> ({index === 0 ? REASON_LABEL.initial : REASON_LABEL[regime.reason]}):{" "}
                {regime.destination.type === "split" ? `pay down ${regime.destination.name}` : `contribute to ${regime.destination.name}`}
                {regime.endDate && ` — until ${formatDate(regime.endDate)}`}
                {" · "}{formatMoney(regime.valueCreated)} created
                {regime.redistributionBreakdown && (
                  <div className="reallocation-timeline__breakdown">
                    direct {formatMoney(regime.redistributionBreakdown.directValueCreated)}, redistribution {formatMoney(regime.redistributionBreakdown.redistributionValueCreated)}
                  </div>
                )}
              </li>
            ))}
          </ol>

          <div className="dashboard-stats">
            <div className="result-card result-card--emphasis">
              <span>Total value created</span>
              <strong>{formatMoney(plan.totalValueCreated)}</strong>
              <small>Mortgage interest saved plus any savings interest earned</small>
            </div>
          </div>

          {plan.regimes.some((regime) => regime.redistributionBreakdown) && (() => {
            const totalDirect = plan.regimes.reduce((sum, regime) => sum + (regime.redistributionBreakdown?.directValueCreated ?? regime.valueCreated), 0);
            const totalRedistribution = plan.regimes.reduce((sum, regime) => sum + (regime.redistributionBreakdown?.redistributionValueCreated ?? 0), 0);
            return (
              <p className="muted reallocation-plan__total-breakdown">
                Of which: {formatMoney(totalDirect)} direct, {formatMoney(totalRedistribution)} from redistribution (sum of each regime above)
              </p>
            );
          })()}

          {plan.savingsContributions.length > 0 && (
            <table className="cash-flow-table">
              <thead><tr><th>Account</th><th>Contributed</th><th>Interest earned</th></tr></thead>
              <tbody>
                {plan.savingsContributions.map((contribution) => (
                  <tr key={contribution.accountId}>
                    <th>{contribution.accountName}</th>
                    <td>{formatMoney(contribution.totalContributed)}</td>
                    <td>{formatMoney(contribution.totalInterestEarned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {baselineTotals && withPlanTotals && (
            <div className="combined-position">
              <p className="muted">Combined mortgage position if you follow this plan</p>
              <table className="cash-flow-table">
                <thead><tr><th></th><th>Baseline</th><th>With plan</th></tr></thead>
                <tbody>
                  <tr>
                    <th>Total interest</th>
                    <td>{formatMoney(baselineTotals.totalInterest)}</td>
                    <td>{formatMoney(withPlanTotals.totalInterest)}</td>
                  </tr>
                  <tr>
                    <th>Total repaid</th>
                    <td>{formatMoney(baselineTotals.totalRepayment)}</td>
                    <td>{formatMoney(withPlanTotals.totalRepayment)}</td>
                  </tr>
                  <tr>
                    <th>Loan completion date</th>
                    <td>{baselineTotals.payoffDate ? formatDate(baselineTotals.payoffDate) : "—"}</td>
                    <td>{withPlanTotals.payoffDate ? formatDate(withPlanTotals.payoffDate) : "—"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {chartSeries && (
            <div className="extra-payment-advisor__charts">
              <div>
                <p className="muted">Combined loan balance</p>
                <MultiSeriesTrendChart seriesLabel="Loan balance" series={chartSeries.balance} />
              </div>
              <div>
                <p className="muted">Combined cumulative interest</p>
                <MultiSeriesTrendChart seriesLabel="Cumulative interest" series={chartSeries.interest} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
