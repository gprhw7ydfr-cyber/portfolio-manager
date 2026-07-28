import { useState } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import { createDefaultMortgageScenario } from "../../domain/mortgage/createDefaultMortgageScenario";
import type { MortgageScenario } from "../../domain/mortgage/MortgageScenario";
import { MortgageScenarioDetail } from "./MortgageScenarioDetail";

export function MortgageScenarioList() {
  const [portfolio, setPortfolio] = usePortfolio();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const selectedScenario = portfolio.mortgageScenarios.find((scenario) => scenario.id === selectedScenarioId);

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
    </div>
  );
}
