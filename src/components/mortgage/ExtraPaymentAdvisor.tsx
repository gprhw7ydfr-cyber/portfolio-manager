import { useMemo, useState } from "react";
import { recommendExtraPayment, buildExtraPaymentTestMortgage, type ExtraPaymentMode } from "../../domain/mortgage/recommendExtraPayment";
import { compareCombinedMortgage } from "../../domain/mortgage/combinedMortgageComparison";
import type { MortgageStructure } from "../../domain/mortgage/MortgageStructure";
import type { Asset } from "../../domain/asset/Asset";
import type { AnnualPoint } from "../../domain/dashboard/calculateDashboardCharts";
import { annualSeriesForSchedule } from "../../domain/mortgage/annualSeries";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import { formatMoney } from "../../domain/shared/formatMoney";
import { MultiSeriesTrendChart } from "../scenario/MultiSeriesTrendChart";
import { getCategorical } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";
import { ReallocationPlanPanel } from "./ReallocationPlanPanel";

const formatPayoffDate = (date?: Date) => date ? date.toLocaleDateString("en-NZ", { month: "short", year: "numeric" }) : "—";

interface ExtraPaymentAdvisorProps<T extends MortgageStructure> {
  mortgage: T;
  assets: Asset[];
}

const DEFAULT_TEST_AMOUNT = 5000;

const MODE_OPTIONS: { value: ExtraPaymentMode; label: string; adornment: string }[] = [
  { value: "lump-sum", label: "One-off lump sum", adornment: "one-off" },
  { value: "weekly", label: "Weekly extra payment", adornment: "/week" },
  { value: "monthly", label: "Monthly extra payment", adornment: "/month" },
];

function monthsBetween(from: Date, to: Date): number {
  return (from.getFullYear() - to.getFullYear()) * 12 + (from.getMonth() - to.getMonth());
}

function formatMonths(months: number): string {
  const sign = months < 0 ? "-" : "";
  const magnitude = Math.abs(months);
  const years = Math.floor(magnitude / 12);
  const remainingMonths = magnitude % 12;
  if (years === 0 && remainingMonths === 0) return "0 mo";
  if (years === 0) return `${sign}${remainingMonths} mo`;
  if (remainingMonths === 0) return `${sign}${years} yr`;
  return `${sign}${years} yr ${remainingMonths} mo`;
}

function formatTimeSaved(baseline?: Date, withExtra?: Date): string {
  if (!baseline || !withExtra) return "—";
  const months = monthsBetween(baseline, withExtra);
  return months <= 0 ? "—" : formatMonths(months);
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

export function ExtraPaymentAdvisor<T extends MortgageStructure>({ mortgage, assets }: ExtraPaymentAdvisorProps<T>) {
  const [amount, setAmount] = useState(DEFAULT_TEST_AMOUNT);
  const [mode, setMode] = useState<ExtraPaymentMode>("lump-sum");
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const [theme] = useTheme();
  const categorical = getCategorical(theme);

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
        { label: "Baseline", color: categorical.blue, points: baselineBalance },
        { label: "With extra payment", color: categorical.orange, points: extendSeries(withExtraBalance, lastYear, "zero") },
      ],
      interest: [
        { label: "Baseline", color: categorical.blue, points: baselineInterest },
        { label: "With extra payment", color: categorical.orange, points: extendSeries(withExtraInterest, lastYear, "hold") },
      ],
    };
  }, [selected, categorical]);

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
              <th>
                {option.splitName}{index === 0 ? " — Recommended" : ""}
                {option.redistributionBreakdown && (
                  <span className="extra-payment-advisor__marker" title="Part of this figure comes from redistribution with your other splits — see the breakdown below">†</span>
                )}
              </th>
              <td>{formatMoney(option.interestSaved)}</td>
              <td>{formatTimeSaved(option.payoffDateBaseline, option.payoffDateWithExtraPayment)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected?.redistributionBreakdown && (() => {
        const breakdown = selected.redistributionBreakdown;
        const totalMonths = selected.payoffDateBaseline && selected.payoffDateWithExtraPayment
          ? monthsBetween(selected.payoffDateBaseline, selected.payoffDateWithExtraPayment)
          : undefined;
        const directMonths = breakdown.directPayoffDateBaseline && breakdown.directPayoffDateWithExtraPayment
          ? monthsBetween(breakdown.directPayoffDateBaseline, breakdown.directPayoffDateWithExtraPayment)
          : undefined;
        const redistributionMonths = totalMonths !== undefined && directMonths !== undefined ? totalMonths - directMonths : undefined;

        return (
          <div className="redistribution-breakdown">
            <p className="muted">†Where {selected.splitName}'s saving actually comes from — this split rebalances with your other splits, so some (or all) of its saving is a knock-on effect of redistribution rather than the extra payment itself.</p>
            <table className="cash-flow-table">
              <thead>
                <tr><th></th><th>Interest</th><th>Time</th></tr>
              </thead>
              <tbody>
                <tr>
                  <th>Direct (this split alone, no redistribution)</th>
                  <td>{formatMoney(breakdown.directInterestSaved)}</td>
                  <td>{directMonths !== undefined ? formatMonths(directMonths) : "—"}</td>
                </tr>
                <tr>
                  <th>Redistribution effect</th>
                  <td>{formatMoney(breakdown.redistributionInterestSaved)}</td>
                  <td>{redistributionMonths !== undefined ? formatMonths(redistributionMonths) : "—"}</td>
                </tr>
                <tr className="cash-flow-table__net">
                  <th>Total (as shown above)</th>
                  <td>{formatMoney(selected.interestSaved)}</td>
                  <td>{formatTimeSaved(selected.payoffDateBaseline, selected.payoffDateWithExtraPayment)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })()}

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
