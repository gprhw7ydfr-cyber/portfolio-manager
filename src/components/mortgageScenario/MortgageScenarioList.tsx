import { useState } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import { createDefaultMortgageScenario } from "../../domain/mortgage/createDefaultMortgageScenario";
import type { MortgageScenario } from "../../domain/mortgage/MortgageScenario";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import { isPropertyAsset } from "../../domain/property/PropertyAsset";
import { MortgageScenarioDetail } from "./MortgageScenarioDetail";

const money = (value: number) => value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

export function MortgageScenarioList() {
  const [portfolio, setPortfolio] = usePortfolio();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const selectedScenario = portfolio.mortgageScenarios.find((scenario) => scenario.id === selectedScenarioId);

  const mortgages = portfolio.liabilities.filter((liability): liability is MortgageLiability => liability.type === "mortgage");
  const unattachedMortgages = mortgages.filter((mortgage) => !mortgage.propertyId);
  const propertiesWithoutMortgage = portfolio.assets
    .filter(isPropertyAsset)
    .filter((property) => !mortgages.some((mortgage) => mortgage.propertyId === property.id));

  const addScenario = () => {
    const scenario = createDefaultMortgageScenario(`Mortgage scenario ${portfolio.mortgageScenarios.length + 1}`);
    setPortfolio((current) => ({ ...current, mortgageScenarios: [...current.mortgageScenarios, scenario] }));
    setSelectedScenarioId(scenario.id);
  };

  const updateScenario = (id: string, changes: Partial<MortgageScenario>) => {
    setPortfolio((current) => ({ ...current, mortgageScenarios: updateById(current.mortgageScenarios, id, changes) }));
  };

  const deleteScenario = (id: string) => {
    setPortfolio((current) => ({
      ...current,
      mortgageScenarios: current.mortgageScenarios.filter((scenario) => scenario.id !== id),
    }));
    setSelectedScenarioId(null);
  };

  const attachMortgage = (mortgageId: string, propertyId: string) => {
    setPortfolio((current) => ({
      ...current,
      liabilities: updateById(current.liabilities, mortgageId, { propertyId }),
    }));
  };

  const deleteMortgage = (mortgageId: string) => {
    setPortfolio((current) => ({
      ...current,
      liabilities: current.liabilities.filter((liability) => liability.id !== mortgageId),
    }));
  };

  if (selectedScenario) {
    return (
      <MortgageScenarioDetail
        portfolio={portfolio}
        scenario={selectedScenario}
        onChange={(changes) => updateScenario(selectedScenario.id, changes)}
        onBack={() => setSelectedScenarioId(null)}
      />
    );
  }

  return (
    <div className="scenario-list-page">
      <section className="calculator">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Mortgage Lab</p>
            <h2>Your mortgage scenarios.</h2>
            <p className="muted">Build and compare alternate mortgage structures before attaching one to a property.</p>
          </div>
        </div>

        {portfolio.mortgageScenarios.length === 0 ? (
          <p className="payment-plan__empty">No mortgage scenarios yet.</p>
        ) : (
          <div className="property-grid-list">
            {portfolio.mortgageScenarios.map((scenario) => {
              const totalPrincipal = scenario.splits.reduce((sum, split) => sum + split.principal, 0);
              return (
                <article className="property-card scenario-card" key={scenario.id}>
                  <button type="button" className="scenario-card__select" onClick={() => setSelectedScenarioId(scenario.id)}>
                    <span className="property-card__type">{scenario.splits.length} split{scenario.splits.length === 1 ? "" : "s"}</span>
                    <h3>{scenario.name}</h3>
                    <p className="muted">{totalPrincipal.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 })} total</p>
                  </button>
                  <button type="button" className="text-button text-button--danger scenario-card__delete" onClick={() => deleteScenario(scenario.id)}>Delete</button>
                </article>
              );
            })}
          </div>
        )}

        <button className="button button--secondary" onClick={addScenario}>+ New mortgage scenario</button>
      </section>

      {unattachedMortgages.length > 0 && (
        <section className="calculator other-mortgages">
          <div className="calculator__heading">
            <div>
              <p className="eyebrow">Unattached mortgages</p>
              <h2>Real mortgages not secured against a property.</h2>
              <p className="muted">Usually left behind when a property was deleted — the mortgage itself is never deleted automatically. Attach it to a property or delete it here.</p>
            </div>
          </div>
          <div className="property-grid-list">
            {unattachedMortgages.map((mortgage) => {
              const totalPrincipal = mortgage.splits.reduce((sum, split) => sum + split.principal, 0);
              return (
                <article className="property-card scenario-card" key={mortgage.id}>
                  <span className="property-card__type">{mortgage.splits.length} split{mortgage.splits.length === 1 ? "" : "s"}</span>
                  <h3>{mortgage.name}</h3>
                  <p className="muted">{money(totalPrincipal)} total</p>
                  {propertiesWithoutMortgage.length > 0 && (
                    <select
                      defaultValue=""
                      onChange={(event) => { if (event.target.value) attachMortgage(mortgage.id, event.target.value); }}
                    >
                      <option value="" disabled>Attach to property&hellip;</option>
                      {propertiesWithoutMortgage.map((property) => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                      ))}
                    </select>
                  )}
                  <button type="button" className="text-button text-button--danger scenario-card__delete" onClick={() => deleteMortgage(mortgage.id)}>Delete</button>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
