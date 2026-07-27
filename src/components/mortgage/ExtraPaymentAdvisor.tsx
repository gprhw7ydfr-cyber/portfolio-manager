import { useMemo, useState } from "react";
import { recommendExtraPayment, buildExtraPaymentTestMortgage, type ExtraPaymentMode } from "../../domain/mortgage/recommendExtraPayment";
import { compareCombinedMortgage } from "../../domain/mortgage/combinedMortgageComparison";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import type { Asset } from "../../domain/asset/Asset";
import type { AnnualPoint } from "../../domain/dashboard/calculateDashboardCharts";
import { annualSeriesForSchedule } from "../../domain/mortgage/annualSeries";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import { formatMoney } from "../../domain/shared/formatMoney";
import { MultiSeriesTrendChart } from "../scenario/MultiSeriesTrendChart";
import { CATEGORICAL } from "../dashboard/chartPalette";
import { ReallocationPlanPanel } from "./ReallocationPlanPanel";

const formatPayoffDate = (date?: Date) => date ? date.toLocaleDateString("en-NZ", { month: "short", year: "numeric" }) : "—";

interface ExtraPaymentAdvisorProps {
  mortgage: MortgageLiability;
  assets: Asset[];
}

const DEFAULT_TEST_AMOUNT = 5000;

const MODE_OPTIONS: { value: ExtraPaymentMode; label: string; adornment: string }[] = [
  { value: "lump-sum", label: "One-off lump sum", adornment: "one-off" },
  { value: "weekly", label: "Weekly extra payment", adornment: "/week" },
  { value: "monthly", label: "Monthly extra payment", adornment: "/month" },
];

function formatTimeSaved(baseline?: Date, withExtra?: Date): string {
  if (!baseline || !withExtra) return "—";
  const months = (baseline.getFullYear() - withExtra.getFullYear()) * 12 + (baseline.getMonth() - withExtra.getMonth());
  if (months <= 0) return "—";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} mo`;
  if (remainingMonths === 0) return `${years} yr`;
  return `${years} yr ${remainingMonths} mo`;
}

/** Extends a series out to `throughYear` so a split that pays off early doesn't just stop mid-chart —
 *  balance flatlines at zero (visually shows "paid off"), interest holds at its final value (it
 *  doesn't accrue once the loan is gone, but it doesn't reset either). */
function extendSeries(points: AnnualPoint[], throughYear: number, pad: "zero" | "hold"): AnnualPoint[] {
  const last = points.at(-1);
  if (!last || last.year >= throughYear) return points;
  const extra: AnnualPoint[] = [];
  for (let year = last.year + 1; year <= throughYear; year += 1) {
    extra.push({ year, value: pad === "zero" ? 0 : last.value });
  }
  return [...points, ...extra];
}

export function ExtraPaymentAdvisor({ mortgage, assets }: ExtraPaymentAdvisorProps) {
  const [amount, setAmount] = useState(DEFAULT_TEST_AMOUNT);
  const [mode, setMode] = useState<ExtraPaymentMode>("lump-sum");
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);

  const analysis = useMemo(
    () => recommendExtraPayment(mortgage, assets, amount, mode),
    [mortgage, assets, amount, mode],
  );

  const selected = analysis.options.find((option) => option.splitId === selectedSplitId) ?? analysis.options[0];

  const chartSeries = useMemo(() => {
    if (!selected) return null;
    const baselineBalance = annualSeriesForSchedule(selected.baselineSchedule).map((point) => ({ year: point.year, value: point.closingBalance }));
    const withExtraBalance = annualSeriesForSchedule(selected.withExtraPaymentSchedule).map((point) => ({ year: point.year, value: point.closingBalance }));
    const baselineInterest = annualSeriesForSchedule(selected.baselineSchedule).map((point) => ({ year: point.year, value: point.cumulativeInterest }));
    const withExtraInterest = annualSeriesForSchedule(selected.withExtraPaymentSchedule).map((point) => ({ year: point.year, value: point.cumulativeInterest }));
    const lastYear = baselineBalance.at(-1)?.year ?? withExtraBalance.at(-1)?.year;
    if (lastYear === undefined) return null;

    return {
      balance: [
        { label: "Baseline", color: CATEGORICAL.blue, points: baselineBalance },
        { label: "With extra payment", color: CATEGORICAL.orange, points: extendSeries(withExtraBalance, lastYear, "zero") },
      ],
      interest: [
        { label: "Baseline", color: CATEGORICAL.blue, points: baselineInterest },
        { label: "With extra payment", color: CATEGORICAL.orange, points: extendSeries(withExtraInterest, lastYear, "hold") },
      ],
    };
  }, [selected]);

  const combinedComparison = useMemo(() => {
    if (!selected) return null;
    const testMortgage = buildExtraPaymentTestMortgage(mortgage, selected.splitId, amount, mode, new Date(), selected.baselineSchedule);
    return compareCombinedMortgage(mortgage, testMortgage, assets);
  }, [mortgage, assets, amount, mode, selected]);

  if (analysis.options.length < 2) {
    return null;
  }

  const activeMode = MODE_OPTIONS.find((option) => option.value === mode) ?? MODE_OPTIONS[0];

  return (
    <div className="property-section extra-payment-advisor">
      <div className="property-section__heading">
        <div>
          <span className="split-card__label">Extra payment advisor</span>
          <h4>Where should extra money go?</h4>
        </div>
      </div>
      <p className="muted">Compares each split by re-running the real simulation — offset, redistribution, and refixing all included, not a rate estimate.</p>

      <div className="extra-payment-advisor__controls">
        <label className="rate-type">
          <span>Payment type</span>
          <select value={mode} onChange={(event) => setMode(event.target.value as ExtraPaymentMode)}>
            {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="offset-target">
          <span>Amount</span>
          <span className="inline-control">
            <b>$</b>
            <input type="number" min="0" step="50" value={amount} onFocus={selectIfZero(amount)} onChange={(event) => setAmount(numberFromInput(amount, event.target.value))} />
            <b>{activeMode.adornment}</b>
          </span>
        </label>
      </div>

      <table className="cash-flow-table">
        <thead>
          <tr><th>Split</th><th>Interest saved</th><th>Time saved</th></tr>
        </thead>
        <tbody>
          {analysis.options.map((option, index) => (
            <tr
              key={option.splitId}
              className={`extra-payment-advisor__row${selected?.splitId === option.splitId ? " extra-payment-advisor__row--selected" : ""}${index === 0 ? " cash-flow-table__net" : ""}`}
              onClick={() => setSelectedSplitId(option.splitId)}
            >
              <th>{option.splitName}{index === 0 ? " — Recommended" : ""}</th>
              <td>{formatMoney(option.interestSaved)}</td>
              <td>{formatTimeSaved(option.payoffDateBaseline, option.payoffDateWithExtraPayment)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && chartSeries && (
        <div className="extra-payment-advisor__charts">
          <div>
            <p className="muted">Loan balance — {selected.splitName}</p>
            <MultiSeriesTrendChart seriesLabel="Loan balance" series={chartSeries.balance} />
          </div>
          <div>
            <p className="muted">Cumulative interest — {selected.splitName}</p>
            <MultiSeriesTrendChart seriesLabel="Cumulative interest" series={chartSeries.interest} />
          </div>
        </div>
      )}

      {combinedComparison && (
        <div className="combined-position">
          <p className="muted">Combined mortgage position if you follow this recommendation</p>
          <table className="cash-flow-table">
            <thead>
              <tr><th></th><th>Baseline</th><th>With recommendation</th></tr>
            </thead>
            <tbody>
              <tr>
                <th>Total interest</th>
                <td>{formatMoney(combinedComparison.baseline.totalInterest)}</td>
                <td>{formatMoney(combinedComparison.withChanges.totalInterest)}</td>
              </tr>
              <tr>
                <th>Total repaid</th>
                <td>{formatMoney(combinedComparison.baseline.totalRepayment)}</td>
                <td>{formatMoney(combinedComparison.withChanges.totalRepayment)}</td>
              </tr>
              <tr>
                <th>Loan completion date</th>
                <td>{formatPayoffDate(combinedComparison.baseline.payoffDate)}</td>
                <td>{formatPayoffDate(combinedComparison.withChanges.payoffDate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {mode !== "lump-sum" && (
        <ReallocationPlanPanel mortgage={mortgage} assets={assets} testAmount={amount} interval={mode} />
      )}
    </div>
  );
}
