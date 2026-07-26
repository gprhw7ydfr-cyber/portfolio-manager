import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import { createDefaultSplit } from "../../domain/mortgage/createDefaultSplit";
import { isPropertyAsset } from "../../domain/property/PropertyAsset";
import { isCashAccount } from "../../domain/cash/CashAccount";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";
import { MortgagePanel } from "../mortgage/MortgagePanel";
import { CapitalImprovementRow } from "./CapitalImprovementRow";
import type { PropertyAsset, PropertyType, CapitalImprovement } from "../../domain/property/PropertyAsset";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";

interface PropertyDetailProps {
  propertyId: string;
  onBack: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

const typeLabel: Record<PropertyType, string> = {
  "residential-property": "Residential property",
  "commercial-property": "Commercial property",
  "vacant-land": "Vacant land",
};

export function PropertyDetail({ propertyId, onBack }: PropertyDetailProps) {
  const [portfolio, setPortfolio] = usePortfolio();

  const property = portfolio.assets.find(
    (asset): asset is PropertyAsset => asset.id === propertyId && isPropertyAsset(asset),
  );

  const mortgages = portfolio.liabilities.filter(
    (liability): liability is MortgageLiability => liability.type === "mortgage",
  );
  const attachedMortgage = mortgages.find((mortgage) => mortgage.propertyId === propertyId);
  const unattachedMortgages = mortgages.filter((mortgage) => !mortgage.propertyId);
  const cashAccounts = portfolio.assets.filter(isCashAccount);

  const updateProperty = (changes: Partial<PropertyAsset>) => {
    setPortfolio((current) => ({
      ...current,
      assets: updateById(current.assets, propertyId, changes),
    }));
  };

  const updateMortgage = (id: string, changes: Partial<MortgageLiability>) => {
    setPortfolio((current) => ({
      ...current,
      liabilities: updateById(current.liabilities, id, changes),
    }));
  };

  const createMortgage = () => {
    if (!property) return;
    const mortgage: MortgageLiability = {
      id: crypto.randomUUID(),
      type: "mortgage",
      name: `${property.name} mortgage`,
      ownership: property.ownership,
      propertyId,
      frequency: "monthly",
      startDate: today(),
      splits: [createDefaultSplit("Main loan")],
    };
    setPortfolio((current) => ({ ...current, liabilities: [...current.liabilities, mortgage] }));
  };

  const addCapitalImprovement = () => {
    if (!property) return;
    const improvement: CapitalImprovement = { id: crypto.randomUUID(), description: "", cost: 0, date: today() };
    updateProperty({ capitalImprovements: [...property.capitalImprovements, improvement] });
  };

  const updateCapitalImprovement = (id: string, changes: Partial<CapitalImprovement>) => {
    if (!property) return;
    updateProperty({ capitalImprovements: updateById(property.capitalImprovements, id, changes) });
  };

  const deleteCapitalImprovement = (id: string) => {
    if (!property) return;
    updateProperty({ capitalImprovements: property.capitalImprovements.filter((item) => item.id !== id) });
  };

  const deleteProperty = () => {
    setPortfolio((current) => ({
      ...current,
      assets: current.assets.filter((asset) => asset.id !== propertyId),
      liabilities: current.liabilities.map((liability) =>
        liability.type === "mortgage" && liability.propertyId === propertyId
          ? { ...liability, propertyId: undefined }
          : liability,
      ),
    }));
    onBack();
  };

  if (!property) {
    return null;
  }

  const ownerNames = property.ownership
    .map((stake) => {
      const entity = portfolio.entities.find((item) => item.id === stake.entityId);
      return `${entity?.name ?? "Unknown"} (${stake.percentage}%)`;
    })
    .join(", ");

  return (
    <section className="property-detail">
      <button className="text-button" onClick={onBack}>&larr; Back to properties</button>

      <div className="property-detail__heading">
        <div>
          <p className="eyebrow">{typeLabel[property.type]}</p>
          <h2>{property.name}</h2>
          <p className="muted">{ownerNames || "No owner assigned"}</p>
        </div>
        <button className="text-button text-button--danger" onClick={deleteProperty}>Delete property</button>
      </div>

      <div className="property-section">
        <h4>General</h4>
        <div className="property-grid">
          <label className="input-row">
            <span>Nickname</span>
            <span className="input-row__control">
              <input type="text" value={property.name} onChange={(e) => updateProperty({ name: e.target.value })} />
            </span>
          </label>
          <label className="input-row">
            <span>Address</span>
            <span className="input-row__control">
              <input type="text" value={property.address} onChange={(e) => updateProperty({ address: e.target.value })} />
            </span>
          </label>
          <label className="input-row">
            <span>Property type</span>
            <span className="input-row__control">
              <select value={property.type} onChange={(e) => updateProperty({ type: e.target.value as PropertyType })}>
                <option value="residential-property">Residential</option>
                <option value="commercial-property">Commercial</option>
                <option value="vacant-land">Vacant land</option>
              </select>
            </span>
          </label>
          <label className="input-row">
            <span>Purchase date</span>
            <span className="input-row__control">
              <input type="date" value={property.purchaseDate} onChange={(e) => updateProperty({ purchaseDate: e.target.value })} />
            </span>
          </label>
          <label className="input-row">
            <span>Purchase price</span>
            <span className="input-row__control">
              <b className="input-row__adornment">$</b>
              <input type="number" min="0" step="1000" value={property.purchasePrice} onFocus={selectIfZero(property.purchasePrice)} onChange={(e) => updateProperty({ purchasePrice: numberFromInput(property.purchasePrice, e.target.value) })} />
            </span>
          </label>
          <label className="input-row">
            <span>Current value</span>
            <span className="input-row__control">
              <b className="input-row__adornment">$</b>
              <input type="number" min="0" step="1000" value={property.currentValue} onFocus={selectIfZero(property.currentValue)} onChange={(e) => updateProperty({ currentValue: numberFromInput(property.currentValue, e.target.value) })} />
            </span>
          </label>
          <label className="input-row">
            <span>Capital value</span>
            <span className="input-row__control">
              <b className="input-row__adornment">$</b>
              <input type="number" min="0" step="1000" value={property.capitalValue ?? 0} onFocus={selectIfZero(property.capitalValue ?? 0)} onChange={(e) => updateProperty({ capitalValue: numberFromInput(property.capitalValue ?? 0, e.target.value) })} />
            </span>
          </label>
          <label className="input-row">
            <span>Estimated market value</span>
            <span className="input-row__control">
              <b className="input-row__adornment">$</b>
              <input type="number" min="0" step="1000" value={property.estimatedMarketValue ?? 0} onFocus={selectIfZero(property.estimatedMarketValue ?? 0)} onChange={(e) => updateProperty({ estimatedMarketValue: numberFromInput(property.estimatedMarketValue ?? 0, e.target.value) })} />
            </span>
          </label>
          <label className="input-row">
            <span>Floor area</span>
            <span className="input-row__control">
              <input type="number" min="0" step="1" value={property.floorArea ?? 0} onFocus={selectIfZero(property.floorArea ?? 0)} onChange={(e) => updateProperty({ floorArea: numberFromInput(property.floorArea ?? 0, e.target.value) })} />
              <span className="input-row__adornment">m&sup2;</span>
            </span>
          </label>
          <label className="input-row">
            <span>Land area</span>
            <span className="input-row__control">
              <input type="number" min="0" step="1" value={property.landArea ?? 0} onFocus={selectIfZero(property.landArea ?? 0)} onChange={(e) => updateProperty({ landArea: numberFromInput(property.landArea ?? 0, e.target.value) })} />
              <span className="input-row__adornment">m&sup2;</span>
            </span>
          </label>
          <label className="input-row">
            <span>Construction year</span>
            <span className="input-row__control">
              <input type="number" min="0" step="1" value={property.constructionYear ?? 0} onFocus={selectIfZero(property.constructionYear ?? 0)} onChange={(e) => updateProperty({ constructionYear: numberFromInput(property.constructionYear ?? 0, e.target.value) })} />
            </span>
          </label>
        </div>
      </div>

      <div className="property-section">
        <h4>Income</h4>
        <div className="property-grid">
          <label className="input-row">
            <span>Rent</span>
            <span className="input-row__control">
              <b className="input-row__adornment">$</b>
              <input type="number" min="0" step="10" value={property.income.rentPerWeek} onFocus={selectIfZero(property.income.rentPerWeek)} onChange={(e) => updateProperty({ income: { ...property.income, rentPerWeek: numberFromInput(property.income.rentPerWeek, e.target.value) } })} />
              <span className="input-row__adornment">/week</span>
            </span>
          </label>
          <label className="input-row">
            <span>Other income</span>
            <span className="input-row__control">
              <b className="input-row__adornment">$</b>
              <input type="number" min="0" step="100" value={property.income.otherIncomePerYear} onFocus={selectIfZero(property.income.otherIncomePerYear)} onChange={(e) => updateProperty({ income: { ...property.income, otherIncomePerYear: numberFromInput(property.income.otherIncomePerYear, e.target.value) } })} />
              <span className="input-row__adornment">/year</span>
            </span>
          </label>
        </div>
      </div>

      <div className="property-section">
        <h4>Expenses</h4>
        <div className="property-grid">
          {([
            ["ratesPerYear", "Rates"],
            ["insurancePerYear", "Insurance"],
            ["maintenancePerYear", "Maintenance"],
            ["bodyCorporatePerYear", "Body corporate"],
            ["propertyManagementPerYear", "Property management"],
            ["utilitiesPerYear", "Utilities"],
            ["otherExpensesPerYear", "Other expenses"],
          ] as const).map(([key, label]) => (
            <label className="input-row" key={key}>
              <span>{label}</span>
              <span className="input-row__control">
                <b className="input-row__adornment">$</b>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={property.expenses[key]}
                  onFocus={selectIfZero(property.expenses[key])}
                  onChange={(e) => updateProperty({ expenses: { ...property.expenses, [key]: numberFromInput(property.expenses[key], e.target.value) } })}
                />
                <span className="input-row__adornment">/year</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="property-section">
        <div className="property-section__heading">
          <h4>Capital improvements</h4>
          <button className="text-button" onClick={addCapitalImprovement}>+ Add improvement</button>
        </div>
        {property.capitalImprovements.length === 0 ? (
          <p className="payment-plan__empty">No capital improvements recorded.</p>
        ) : (
          <div className="payment-rules">
            {property.capitalImprovements.map((improvement) => (
              <CapitalImprovementRow
                key={improvement.id}
                improvement={improvement}
                onChange={(changes) => updateCapitalImprovement(improvement.id, changes)}
                onDelete={() => deleteCapitalImprovement(improvement.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="property-section">
        <h4>Mortgage</h4>
        {attachedMortgage ? (
          <MortgagePanel
            mortgage={attachedMortgage}
            cashAccounts={cashAccounts}
            onChange={(changes) => updateMortgage(attachedMortgage.id, changes)}
            title={attachedMortgage.name}
            subtitle="Secured against this property."
          />
        ) : (
          <div className="property-mortgage-picker">
            <p className="muted">No mortgage attached to this property yet.</p>
            <div className="property-mortgage-picker__actions">
              {unattachedMortgages.length > 0 && (
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) updateMortgage(e.target.value, { propertyId });
                  }}
                >
                  <option value="" disabled>Attach an existing mortgage&hellip;</option>
                  {unattachedMortgages.map((mortgage) => (
                    <option key={mortgage.id} value={mortgage.id}>{mortgage.name}</option>
                  ))}
                </select>
              )}
              <button className="button button--secondary" onClick={createMortgage}>+ Add new mortgage</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
