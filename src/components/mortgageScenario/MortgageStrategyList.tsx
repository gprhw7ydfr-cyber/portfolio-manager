import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import type { MortgageScenario } from "../../domain/mortgage/MortgageScenario";
import type { MortgageStrategy } from "../../domain/mortgage/MortgageStrategy";
import { MortgageStrategyRow } from "./MortgageStrategyRow";

interface MortgageStrategyListProps {
  scenario: MortgageScenario;
  strategies: MortgageStrategy[];
}

export function MortgageStrategyList({ scenario, strategies }: MortgageStrategyListProps) {
  const [, setPortfolio] = usePortfolio();

  const addStrategy = () => {
    const strategy: MortgageStrategy = {
      id: crypto.randomUUID(),
      scenarioId: scenario.id,
      name: `Strategy ${strategies.length + 1}`,
    };
    setPortfolio((current) => ({ ...current, mortgageStrategies: [...current.mortgageStrategies, strategy] }));
  };

  const updateStrategy = (id: string, changes: Partial<MortgageStrategy>) => {
    setPortfolio((current) => ({ ...current, mortgageStrategies: updateById(current.mortgageStrategies, id, changes) }));
  };

  const deleteStrategy = (id: string) => {
    setPortfolio((current) => ({ ...current, mortgageStrategies: current.mortgageStrategies.filter((strategy) => strategy.id !== id) }));
  };

  return (
    <div className="property-section mortgage-strategy-list">
      <div className="property-section__heading">
        <div>
          <span className="split-card__label">Strategies</span>
          <h4>Layer a plan on top of this scenario.</h4>
        </div>
        <button className="button button--secondary" onClick={addStrategy}>+ New strategy</button>
      </div>
      <p className="muted">Extra payments and rate/refix overrides — save a few and compare them below.</p>

      {strategies.length === 0 ? (
        <p className="payment-plan__empty">No strategies yet for this scenario.</p>
      ) : (
        <div className="split-list">
          {strategies.map((strategy) => (
            <MortgageStrategyRow
              key={strategy.id}
              strategy={strategy}
              splits={scenario.splits}
              onChange={(changes) => updateStrategy(strategy.id, changes)}
              onDelete={() => deleteStrategy(strategy.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
