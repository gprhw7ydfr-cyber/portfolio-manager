import { useState } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import type { Portfolio } from "../../domain/portfolio/Portfolio";
import type { MortgageScenario } from "../../domain/mortgage/MortgageScenario";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import { isPropertyAsset, type PropertyAsset } from "../../domain/property/PropertyAsset";
import { isCashAccount } from "../../domain/cash/CashAccount";
import { createMortgageLiabilityFromStructure } from "../../domain/mortgage/createMortgageLiabilityFromStructure";
import { calculateDashboardStats, type DashboardStats } from "../../domain/dashboard/calculateDashboardStats";
import { formatMoney } from "../../domain/shared/formatMoney";
import { MortgagePanel } from "../mortgage/MortgagePanel";
import { MortgageScenarioComparison } from "./MortgageScenarioComparison";

interface MortgageScenarioDetailProps {
  portfolio: Portfolio;
  scenario: MortgageScenario;
  onChange: (changes: Partial<MortgageScenario>) => void;
  onBack: () => void;
}

interface AttachPreview {
  property: PropertyAsset;
  newLiability: MortgageLiability;
  existingMortgageId?: string;
  before: DashboardStats;
  after: DashboardStats;
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export function MortgageScenarioDetail({ portfolio, scenario, onChange, onBack }: MortgageScenarioDetailProps) {
  const [, setPortfolio] = usePortfolio();
  const cashAccounts = portfolio.assets.filter(isCashAccount);
  const properties = portfolio.assets.filter(isPropertyAsset);

  const [attachPropertyId, setAttachPropertyId] = useState("");
  const [attachPreview, setAttachPreview] = useState<AttachPreview | null>(null);
  const [attachedMessage, setAttachedMessage] = useState<string | null>(null);

  const previewAttach = () => {
    const property = properties.find((candidate) => candidate.id === attachPropertyId);
    if (!property) return;

    const existingMortgage = portfolio.liabilities.find(
      (liability) => liability.type === "mortgage" && liability.propertyId === property.id,
    );
    const newLiability = createMortgageLiabilityFromStructure(scenario, property.ownership, property.id, {
      sourceScenarioId: scenario.id,
    });
    const hypotheticalLiabilities = [
      ...portfolio.liabilities.filter((liability) => liability.id !== existingMortgage?.id),
      newLiability,
    ];

    setAttachPreview({
      property,
      newLiability,
      existingMortgageId: existingMortgage?.id,
      before: calculateDashboardStats(portfolio),
      after: calculateDashboardStats({ ...portfolio, liabilities: hypotheticalLiabilities }),
    });
    setAttachedMessage(null);
  };

  const confirmAttach = () => {
    if (!attachPreview) return;
    setPortfolio((current) => ({
      ...current,
      liabilities: [
        ...current.liabilities.map((liability) =>
          liability.id === attachPreview.existingMortgageId ? { ...liability, propertyId: undefined } : liability,
        ),
        attachPreview.newLiability,
      ],
    }));
    setAttachedMessage(`Attached to ${attachPreview.property.name}. View it under Properties.`);
    setAttachPreview(null);
    setAttachPropertyId("");
  };

  return (
    <div className="scenario-detail">
      <div className="calculator__heading">
        <div>
          <p className="eyebrow">Mortgage Lab</p>
          <h2>
            <input className="split-card__name scenario-name" aria-label="Scenario name" value={scenario.name} onChange={(event) => onChange({ name: event.target.value })} />
          </h2>
          <p className="muted">Build and compare a mortgage structure before attaching it to a property.</p>
        </div>
        <button className="button button--secondary" onClick={onBack}>&larr; Back to Mortgage Lab</button>
      </div>

      <label className="input-row">
        <span>Notes</span>
        <span className="input-row__control">
          <input value={scenario.notes ?? ""} onChange={(event) => onChange({ notes: event.target.value })} placeholder="Optional notes about this scenario" />
        </span>
      </label>

      <MortgagePanel
        mortgage={scenario}
        cashAccounts={cashAccounts}
        onChange={onChange}
        title="Plan this scenario, split by split."
        subtitle="Adjust each loan independently and see the combined position below."
      />

      <MortgageScenarioComparison portfolio={portfolio} scenario={scenario} assets={cashAccounts} />

      <div className="property-section mortgage-attach">
        <div className="property-section__heading">
          <div>
            <span className="split-card__label">Attach</span>
            <h4>Ready to use this on a property?</h4>
          </div>
        </div>
        {properties.length === 0 ? (
          <p className="payment-plan__empty">Add a property first to attach a mortgage to it.</p>
        ) : (
          <>
            <div className="product-settings">
              <label className="rate-type">
                <span>Property</span>
                <select value={attachPropertyId} onChange={(event) => { setAttachPropertyId(event.target.value); setAttachPreview(null); }}>
                  <option value="" disabled>Choose a property&hellip;</option>
                  {properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
                </select>
              </label>
            </div>
            <button className="button button--secondary" disabled={!attachPropertyId} onClick={previewAttach}>Preview attach</button>

            {attachPreview && (
              <div className="combined-position">
                <p className="muted">
                  {attachPreview.existingMortgageId
                    ? `${attachPreview.property.name} already has an attached mortgage — it will become unattached, not deleted.`
                    : `Impact on your dashboard if attached to ${attachPreview.property.name}:`}
                </p>
                <table className="cash-flow-table">
                  <thead><tr><th></th><th>Now</th><th>After attaching</th></tr></thead>
                  <tbody>
                    <tr>
                      <th>Net worth</th>
                      <td>{formatMoney(attachPreview.before.netWorth)}</td>
                      <td>{formatMoney(attachPreview.after.netWorth)}</td>
                    </tr>
                    <tr>
                      <th>Total mortgage debt</th>
                      <td>{formatMoney(attachPreview.before.totalMortgageDebt)}</td>
                      <td>{formatMoney(attachPreview.after.totalMortgageDebt)}</td>
                    </tr>
                    <tr>
                      <th>Loan-to-value ratio</th>
                      <td>{percent(attachPreview.before.loanToValueRatio)}</td>
                      <td>{percent(attachPreview.after.loanToValueRatio)}</td>
                    </tr>
                  </tbody>
                </table>
                <button className="button button--secondary" onClick={confirmAttach}>Confirm attach</button>
              </div>
            )}

            {attachedMessage && <p className="muted">{attachedMessage}</p>}
          </>
        )}
      </div>
    </div>
  );
}
