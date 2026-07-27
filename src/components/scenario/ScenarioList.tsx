import { useState } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import { createDefaultScenario } from "../../domain/scenario/createDefaultScenario";
import type { Scenario } from "../../domain/scenario/Scenario";
import { ScenarioDetail } from "./ScenarioDetail";

export function ScenarioList() {
  const [portfolio, setPortfolio] = usePortfolio();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  const selectedScenario = portfolio.scenarios.find((scenario) => scenario.id === selectedScenarioId);

  const addScenario = () => {
    const scenario = createDefaultScenario(`Strategy ${portfolio.scenarios.length + 1}`);
    setPortfolio((current) => ({ ...current, scenarios: [...current.scenarios, scenario] }));
    setSelectedScenarioId(scenario.id);
  };

  const updateScenario = (id: string, changes: Partial<Scenario>) => {
    setPortfolio((current) => ({ ...current, scenarios: updateById(current.scenarios, id, changes) }));
  };

  const deleteScenario = (id: string) => {
    setPortfolio((current) => ({ ...current, scenarios: current.scenarios.filter((scenario) => scenario.id !== id) }));
    setSelectedScenarioId(null);
  };

  if (selectedScenario) {
    return (
      <ScenarioDetail
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
            <p className="eyebrow">Strategy simulator</p>
            <h2>Your strategies.</h2>
            <p className="muted">Compare "what if" plans — buying, selling, renovating, or refinancing — against doing nothing.</p>
          </div>
        </div>

        {portfolio.scenarios.length === 0 ? (
          <p className="payment-plan__empty">No strategies yet.</p>
        ) : (
          <div className="property-grid-list">
            {portfolio.scenarios.map((scenario) => (
              <article className="property-card scenario-card" key={scenario.id}>
                <button type="button" className="scenario-card__select" onClick={() => setSelectedScenarioId(scenario.id)}>
                  <span className="property-card__type">{scenario.assumptions.projectionYears}-year plan</span>
                  <h3>{scenario.name}</h3>
                  <p className="muted">{scenario.events.length} strategy action{scenario.events.length === 1 ? "" : "s"}</p>
                </button>
                <button type="button" className="text-button text-button--danger scenario-card__delete" onClick={() => deleteScenario(scenario.id)}>Delete</button>
              </article>
            ))}
          </div>
        )}

        <button className="button button--secondary" onClick={addScenario}>+ New strategy</button>
      </section>
    </div>
  );
}
