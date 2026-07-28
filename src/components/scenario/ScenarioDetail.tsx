import type { Portfolio } from "../../domain/portfolio/Portfolio";
import type { Scenario, ScenarioAssumptions } from "../../domain/scenario/Scenario";
import type { StrategyEvent, StrategyEventChanges, BuyPropertyEvent } from "../../domain/scenario/StrategyEvent";
import { buyEventPropertyId, buyEventSplitId } from "../../domain/scenario/StrategyEvent";
import { isPropertyAsset } from "../../domain/property/PropertyAsset";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import { StrategyEventRow, type NamedOption } from "./StrategyEventRow";
import { ScenarioComparison } from "./ScenarioComparison";
import { MonteCarloPanel } from "../montecarlo/MonteCarloPanel";

interface ScenarioDetailProps {
  portfolio: Portfolio;
  scenario: Scenario;
  onChange: (changes: Partial<Scenario>) => void;
  onBack: () => void;
}

const createBuyEvent = (year: number): BuyPropertyEvent => ({
  id: crypto.randomUUID(),
  type: "buy-property",
  year,
  propertyName: "New property",
  price: 500000,
  deposit: 100000,
  annualInterestRate: 6,
  years: 30,
  rentPerWeek: 500,
});

export function ScenarioDetail({ portfolio, scenario, onChange, onBack }: ScenarioDetailProps) {
  const { assumptions, events } = scenario;

  const updateAssumptions = (changes: Partial<ScenarioAssumptions>) => onChange({ assumptions: { ...assumptions, ...changes } });
  const updateEvent = (id: string, changes: StrategyEventChanges) => onChange({
    events: events.map((event) => event.id === id ? { ...event, ...changes } as StrategyEvent : event),
  });
  const deleteEvent = (id: string) => onChange({ events: events.filter((event) => event.id !== id) });
  const addEvent = (event: StrategyEvent) => onChange({ events: [...events, event].sort((a, b) => a.year - b.year) });

  const availableProperties: NamedOption[] = [
    ...portfolio.assets.filter(isPropertyAsset).map((property) => ({ id: property.id, label: property.name })),
    ...events.filter((event): event is BuyPropertyEvent => event.type === "buy-property")
      .map((event) => ({ id: buyEventPropertyId(event), label: `${event.propertyName} (bought year ${event.year})` })),
  ];

  const selectedMortgageScenario = assumptions.mortgageScenarioId
    ? portfolio.mortgageScenarios.find((candidate) => candidate.id === assumptions.mortgageScenarioId)
    : undefined;

  const availableSplits: NamedOption[] = [
    ...(selectedMortgageScenario
      ? selectedMortgageScenario.splits.map((split) => ({ id: split.id, label: `${selectedMortgageScenario.name} — ${split.name}` }))
      : portfolio.liabilities.flatMap((liability) => liability.type === "mortgage"
        ? liability.splits.map((split) => ({ id: split.id, label: `${liability.name} — ${split.name}` }))
        : [])),
    ...events.filter((event): event is BuyPropertyEvent => event.type === "buy-property")
      .map((event) => ({ id: buyEventSplitId(event), label: `${event.propertyName} loan (bought year ${event.year})` })),
  ];

  const addSellEvent = () => addEvent({ id: crypto.randomUUID(), type: "sell-property", year: 1, propertyId: availableProperties[0].id, sellingCostsPercentage: 4 });
  const addRenovateEvent = () => addEvent({ id: crypto.randomUUID(), type: "renovate", year: 1, propertyId: availableProperties[0].id, cost: 20000, expectedValueIncrease: 30000 });
  const addIncreaseEvent = () => addEvent({ id: crypto.randomUUID(), type: "increase-repayments", year: 1, splitId: availableSplits[0].id, amount: 100, interval: "weekly" });
  const addRefinanceEvent = () => addEvent({ id: crypto.randomUUID(), type: "refinance", year: 1, splitId: availableSplits[0].id, annualInterestRate: 5.5 });

  return (
    <div className="scenario-detail">
      <div className="calculator__heading">
        <div>
          <p className="eyebrow">Strategy</p>
          <h2>
            <input className="split-card__name scenario-name" aria-label="Scenario name" value={scenario.name} onChange={(event) => onChange({ name: event.target.value })} />
          </h2>
          <p className="muted">Layer strategy actions and assumptions on top of today's portfolio.</p>
        </div>
        <button className="button button--secondary" onClick={onBack}>&larr; Back to strategies</button>
      </div>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div><p className="eyebrow">Assumptions</p><h2>Growth and rate assumptions.</h2></div>
        </div>
        <div className="input-grid">
          <label className="input-row">
            <span>Projection length</span>
            <span className="input-row__control">
              <input type="number" min="1" max="40" value={assumptions.projectionYears} onChange={(event) => updateAssumptions({ projectionYears: numberFromInput(assumptions.projectionYears, event.target.value) })} />
              <span className="input-row__adornment">years</span>
            </span>
          </label>
          <label className="input-row">
            <span>Property growth</span>
            <span className="input-row__control">
              <input type="number" min="0" step="0.1" value={assumptions.propertyGrowthRate} onFocus={selectIfZero(assumptions.propertyGrowthRate)} onChange={(event) => updateAssumptions({ propertyGrowthRate: numberFromInput(assumptions.propertyGrowthRate, event.target.value) })} />
              <span className="input-row__adornment">% p.a.</span>
            </span>
          </label>
          <label className="input-row">
            <span>Rental growth</span>
            <span className="input-row__control">
              <input type="number" min="0" step="0.1" value={assumptions.rentalGrowthRate} onFocus={selectIfZero(assumptions.rentalGrowthRate)} onChange={(event) => updateAssumptions({ rentalGrowthRate: numberFromInput(assumptions.rentalGrowthRate, event.target.value) })} />
              <span className="input-row__adornment">% p.a.</span>
            </span>
          </label>
          <label className="input-row">
            <span>Expense inflation</span>
            <span className="input-row__control">
              <input type="number" min="0" step="0.1" value={assumptions.expenseInflationRate} onFocus={selectIfZero(assumptions.expenseInflationRate)} onChange={(event) => updateAssumptions({ expenseInflationRate: numberFromInput(assumptions.expenseInflationRate, event.target.value) })} />
              <span className="input-row__adornment">% p.a.</span>
            </span>
          </label>
          <label className="input-row">
            <span>Vacancy rate</span>
            <span className="input-row__control">
              <input type="number" min="0" max="100" step="0.5" value={assumptions.vacancyRate ?? 0} onFocus={selectIfZero(assumptions.vacancyRate ?? 0)} onChange={(event) => updateAssumptions({ vacancyRate: numberFromInput(assumptions.vacancyRate ?? 0, event.target.value) })} />
              <span className="input-row__adornment">% of rent</span>
            </span>
          </label>
        </div>
        <label className="rate-type scenario-rate-override">
          <span>Mortgage rate override</span>
          <input
            type="checkbox"
            checked={assumptions.mortgageRateOverride !== undefined}
            onChange={(event) => updateAssumptions({ mortgageRateOverride: event.target.checked ? 6 : undefined })}
          />
          {assumptions.mortgageRateOverride !== undefined && (
            <span className="inline-control">
              <input type="number" min="0" step="0.01" value={assumptions.mortgageRateOverride} onFocus={selectIfZero(assumptions.mortgageRateOverride)} onChange={(event) => updateAssumptions({ mortgageRateOverride: numberFromInput(assumptions.mortgageRateOverride ?? 0, event.target.value) })} /><b>% p.a. flat, every split</b>
            </span>
          )}
        </label>
        <label className="rate-type">
          <span>Forecast mortgage debt using</span>
          <select
            value={assumptions.mortgageScenarioId ?? ""}
            onChange={(event) => updateAssumptions({ mortgageScenarioId: event.target.value || undefined })}
          >
            <option value="">Current portfolio</option>
            {portfolio.mortgageScenarios.map((mortgageScenario) => (
              <option key={mortgageScenario.id} value={mortgageScenario.id}>{mortgageScenario.name}</option>
            ))}
          </select>
        </label>
        {selectedMortgageScenario && (
          <p className="muted">
            Forecasting against the "{selectedMortgageScenario.name}" Mortgage Lab scenario instead of your real mortgage(s). Refinance and increase-repayments events above target this scenario's own splits.
          </p>
        )}
      </section>

      <section className="calculator other-mortgages">
        <div className="payment-plan__heading">
          <div><p className="eyebrow">Strategy actions</p><h2>What happens, and when.</h2></div>
          <div className="payment-plan__buttons">
            <button className="text-button" onClick={() => addEvent(createBuyEvent(1))}>+ Buy property</button>
            <button className="text-button" disabled={availableProperties.length === 0} onClick={addSellEvent}>+ Sell property</button>
            <button className="text-button" disabled={availableProperties.length === 0} onClick={addRenovateEvent}>+ Renovate</button>
            <button className="text-button" disabled={availableSplits.length === 0} onClick={addIncreaseEvent}>+ Increase repayments</button>
            <button className="text-button" disabled={availableSplits.length === 0} onClick={addRefinanceEvent}>+ Refinance</button>
          </div>
        </div>
        {events.length === 0 ? <p className="payment-plan__empty">No strategy actions yet — this scenario just runs today's portfolio forward.</p> : (
          <div className="payment-rules">
            {events.map((event) => (
              <StrategyEventRow
                key={event.id}
                event={event}
                availableProperties={availableProperties}
                availableSplits={availableSplits}
                onChange={(changes) => updateEvent(event.id, changes)}
                onDelete={() => deleteEvent(event.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="calculator other-mortgages">
        <ScenarioComparison portfolio={portfolio} scenario={scenario} />
      </section>

      <section className="calculator other-mortgages">
        <MonteCarloPanel portfolio={portfolio} scenario={scenario} />
      </section>
    </div>
  );
}
