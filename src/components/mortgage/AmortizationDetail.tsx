import { useState, useMemo } from "react";
import type { AmortizationPayment } from "../../domain/mortgage/AmortizationPayment";
import { annualSeriesForSchedule } from "../../domain/mortgage/annualSeries";
import { annualAmortizationSummary } from "../../domain/mortgage/amortizationDetail";
import { TrendLineChart } from "../dashboard/TrendLineChart";
import { getCategorical } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";
import { useDeveloperMode } from "../../store/useDeveloperMode";
import { formatMoney } from "../../domain/shared/formatMoney";

interface AmortizationDetailProps {
  schedule: AmortizationPayment[];
  label: string;
}

const formatDate = (date: Date) => date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

function formatFormula(payment: AmortizationPayment): string {
  if (payment.chargeableBalance === undefined || payment.daysInPeriod === undefined) return "—";
  return `${formatMoney(payment.chargeableBalance)} × ${payment.annualInterestRate.toFixed(2)}% ÷ 365 × ${payment.daysInPeriod}d = ${formatMoney(payment.interest)}`;
}

export function AmortizationDetail({ schedule, label }: AmortizationDetailProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [theme] = useTheme();
  const categorical = getCategorical(theme);
  const [developerMode] = useDeveloperMode();

  const annualSeries = useMemo(() => annualSeriesForSchedule(schedule), [schedule]);
  const annualRows = useMemo(() => annualAmortizationSummary(schedule), [schedule]);

  if (schedule.length === 0) {
    return null;
  }

  return (
    <div className="amortization-plan">
      <div className="payment-plan__heading">
        <div><span className="split-card__label">Amortization</span><h4>{label}</h4></div>
        <button className="text-button" onClick={() => setExpanded((current) => !current)}>{expanded ? "Hide detail" : "Show detail"}</button>
      </div>

      {expanded && (
        <>
          <div className="amortization-charts">
            <TrendLineChart
              points={annualSeries.map((point) => ({ year: point.year, value: point.closingBalance }))}
              color={categorical.blue}
              seriesLabel="Loan balance"
            />
            <TrendLineChart
              points={annualSeries.map((point) => ({ year: point.year, value: point.cumulativeInterest }))}
              color={categorical.orange}
              seriesLabel="Cumulative interest"
            />
          </div>

          <div className="amortization-table-wrap">
            <table className="cash-flow-table amortization-table">
              <thead>
                <tr><th></th><th>Opening balance</th><th>Interest</th><th>Principal</th><th>Closing balance</th></tr>
              </thead>
              <tbody>
                {annualRows.map((row) => (
                  <tr key={row.year}>
                    <th>{row.year}</th>
                    <td>{formatMoney(row.openingBalance)}</td>
                    <td>{formatMoney(row.interestPaid)}</td>
                    <td>{formatMoney(row.principalPaid)}</td>
                    <td>{formatMoney(row.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="text-button" onClick={() => setShowFullSchedule((current) => !current)}>
            {showFullSchedule ? "Hide full payment-by-payment schedule" : "Show full payment-by-payment schedule"}
          </button>

          {showFullSchedule && (
            <div className="amortization-schedule-scroll">
              <table className="cash-flow-table amortization-table">
                <thead>
                  <tr><th></th><th>Date</th><th>Opening balance</th><th>Repayment</th><th>Interest</th><th>Principal</th><th>Closing balance</th>{developerMode && <th>Formula</th>}</tr>
                </thead>
                <tbody>
                  {schedule.map((payment) => (
                    <tr key={payment.paymentNumber}>
                      <th>{payment.paymentNumber}</th>
                      <td>{formatDate(payment.paymentDate)}</td>
                      <td>{formatMoney(payment.openingBalance)}</td>
                      <td>{formatMoney(payment.repayment)}</td>
                      <td>{formatMoney(payment.interest)}</td>
                      <td>{formatMoney(payment.principal + payment.extraPayment)}</td>
                      <td>{formatMoney(payment.closingBalance)}</td>
                      {developerMode && <td className="developer-formula">{formatFormula(payment)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
