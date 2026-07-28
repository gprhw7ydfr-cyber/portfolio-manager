import { useMemo, useState } from "react";
import type { Portfolio } from "../../domain/portfolio/Portfolio";
import type { MortgageScenario } from "../../domain/mortgage/MortgageScenario";
import type { MortgageStructure } from "../../domain/mortgage/MortgageStructure";
import type { Asset } from "../../domain/asset/Asset";
import { compareMortgageStructures } from "../../domain/mortgage/compareMortgageStructures";
import { annualSeriesForSchedule } from "../../domain/mortgage/annualSeries";
import { formatMoney } from "../../domain/shared/formatMoney";
import { MultiSeriesTrendChart } from "../scenario/MultiSeriesTrendChart";
import { getCategorical } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";

interface MortgageScenarioComparisonProps {
  portfolio: Portfolio;
  scenario: MortgageScenario;
  assets: Asset[];
}

const formatDate = (date?: Date) => date ? date.toLocaleDateString("en-NZ", { month: "short", year: "numeric" }) : "—";

/** Leaves room for the scenario itself, which is always included — 8 total, matching the fixed
 *  8-hue categorical palette. */
const MAX_OTHER_CANDIDATES = 7;

export function MortgageScenarioComparison({ portfolio, scenario, assets }: MortgageScenarioComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [theme] = useTheme();
  const categorical = getCategorical(theme);
  const paletteColors = Object.values(categorical);

  const candidateOptions = useMemo((): { id: string; label: string; structure: MortgageStructure }[] => {
    const otherScenarios = portfolio.mortgageScenarios.filter((candidate) => candidate.id !== scenario.id);
    const attachedMortgages = portfolio.liabilities.filter(
      (liability) => liability.type === "mortgage" && liability.propertyId !== undefined,
    );
    return [
      ...otherScenarios.map((candidate) => ({ id: candidate.id, label: candidate.name, structure: candidate })),
      ...attachedMortgages.map((mortgage) => ({ id: mortgage.id, label: `${mortgage.name} (attached)`, structure: mortgage })),
    ];
  }, [portfolio.mortgageScenarios, portfolio.liabilities, scenario.id]);

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_OTHER_CANDIDATES) return current;
      return [...current, id];
    });
  };

  const entries = useMemo(() => {
    const selected = candidateOptions.filter((option) => selectedIds.includes(option.id));
    if (selected.length === 0) return [];
    return compareMortgageStructures(
      [{ label: scenario.name, structure: scenario }, ...selected.map((option) => ({ label: option.label, structure: option.structure }))],
      assets,
    );
  }, [candidateOptions, scenario, selectedIds, assets]);

  if (candidateOptions.length === 0) {
    return null;
  }

  const chartSeries = entries.map((entry, index) => ({
    label: entry.label,
    color: paletteColors[index % paletteColors.length],
    points: annualSeriesForSchedule(entry.combinedSchedule).map((point) => ({ year: point.year, value: point.closingBalance })),
  }));

  return (
    <div className="property-section mortgage-scenario-comparison">
      <div className="property-section__heading">
        <div>
          <span className="split-card__label">Compare scenarios</span>
          <h4>How does this stack up?</h4>
        </div>
      </div>
      <p className="muted">Pick other saved scenarios or currently-attached mortgages to compare against this one.</p>

      <ul className="mortgage-scenario-comparison__picker">
        {candidateOptions.map((option) => (
          <li key={option.id}>
            <label>
              <input type="checkbox" checked={selectedIds.includes(option.id)} onChange={() => toggle(option.id)} />
              {option.label}
            </label>
          </li>
        ))}
      </ul>

      {entries.length > 0 && (
        <>
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
        </>
      )}
    </div>
  );
}
