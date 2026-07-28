import { useMemo } from "react";
import type { MortgageScenario } from "../../domain/mortgage/MortgageScenario";
import type { MortgageStrategy } from "../../domain/mortgage/MortgageStrategy";
import type { Asset } from "../../domain/asset/Asset";
import { applyMortgageStrategy } from "../../domain/mortgage/applyMortgageStrategy";
import { compareMortgageStructures } from "../../domain/mortgage/compareMortgageStructures";
import { annualSeriesForSchedule } from "../../domain/mortgage/annualSeries";
import { formatMoney } from "../../domain/shared/formatMoney";
import { MultiSeriesTrendChart } from "../scenario/MultiSeriesTrendChart";
import { getCategorical } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";

interface MortgageStrategyComparisonProps {
  scenario: MortgageScenario;
  strategies: MortgageStrategy[];
  assets: Asset[];
}

const formatDate = (date?: Date) => date ? date.toLocaleDateString("en-NZ", { month: "short", year: "numeric" }) : "—";

export function MortgageStrategyComparison({ scenario, strategies, assets }: MortgageStrategyComparisonProps) {
  const [theme] = useTheme();
  const categorical = getCategorical(theme);
  const paletteColors = Object.values(categorical);

  const entries = useMemo(() => {
    if (strategies.length === 0) return [];
    const candidates = [
      { label: "Scenario baseline", structure: scenario },
      ...strategies.map((strategy) => ({ label: strategy.name, structure: applyMortgageStrategy(scenario, strategy, assets) })),
    ];
    return compareMortgageStructures(candidates, assets);
  }, [scenario, strategies, assets]);

  if (strategies.length === 0) {
    return null;
  }

  const chartSeries = entries.map((entry, index) => ({
    label: entry.label,
    color: paletteColors[index % paletteColors.length],
    points: annualSeriesForSchedule(entry.combinedSchedule).map((point) => ({ year: point.year, value: point.closingBalance })),
  }));

  return (
    <div className="property-section mortgage-strategy-comparison">
      <div className="property-section__heading">
        <div>
          <span className="split-card__label">Compare strategies</span>
          <h4>Which plan wins?</h4>
        </div>
      </div>
      <p className="muted">Every strategy compared against this scenario's own unmodified baseline.</p>

      <table className="cash-flow-table">
        <thead>
          <tr><th></th><th>Total interest</th><th>Total repaid</th><th>Loan completion</th></tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.label} className={index === 0 ? "cash-flow-table__net" : undefined}>
              <th>{entry.label}</th>
              <td>{formatMoney(entry.totals.totalInterest)}</td>
              <td>{formatMoney(entry.totals.totalRepayment)}</td>
              <td>{formatDate(entry.totals.payoffDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <MultiSeriesTrendChart seriesLabel="Loan balance" series={chartSeries} />
    </div>
  );
}
