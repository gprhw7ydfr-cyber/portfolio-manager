import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import { isPropertyAsset, type PropertyAsset } from "../../domain/property/PropertyAsset";
import { createDefaultProperty } from "../../domain/property/createDefaultProperty";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import { PropertyCard } from "./PropertyCard";
import { MortgagePanel } from "../mortgage/MortgagePanel";

interface PropertyListProps {
  onSelectProperty: (id: string) => void;
}

export function PropertyList({ onSelectProperty }: PropertyListProps) {
  const [portfolio, setPortfolio] = usePortfolio();

  const properties = portfolio.assets.filter(isPropertyAsset);
  const unattachedMortgages = portfolio.liabilities.filter(
    (liability): liability is MortgageLiability => liability.type === "mortgage" && !liability.propertyId,
  );

  const addProperty = () => {
    const ownership = portfolio.entities.length > 0
      ? [{ entityId: portfolio.entities[0].id, percentage: 100 }]
      : [];
    const property = createDefaultProperty(`Property ${properties.length + 1}`, ownership);
    setPortfolio((current) => ({ ...current, assets: [...current.assets, property] }));
    onSelectProperty(property.id);
  };

  const updateMortgage = (id: string, changes: Partial<MortgageLiability>) => {
    setPortfolio((current) => ({
      ...current,
      liabilities: updateById(current.liabilities, id, changes),
    }));
  };

  return (
    <div className="property-list-page">
      <section className="calculator">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Property portfolio</p>
            <h2>Your properties.</h2>
            <p className="muted">Add a property to track its value, income, expenses, and mortgage.</p>
          </div>
        </div>

        {properties.length === 0 ? (
          <p className="payment-plan__empty">No properties yet.</p>
        ) : (
          <div className="property-grid-list">
            {properties.map((property: PropertyAsset) => (
              <PropertyCard key={property.id} property={property} onSelect={() => onSelectProperty(property.id)} />
            ))}
          </div>
        )}

        <button className="button button--secondary" onClick={addProperty}>+ Add property</button>
      </section>

      {unattachedMortgages.length > 0 && (
        <section className="calculator other-mortgages">
          <div className="calculator__heading">
            <div>
              <p className="eyebrow">Other mortgages</p>
              <h2>Mortgages not attached to a property.</h2>
            </div>
          </div>
          <div className="split-list">
            {unattachedMortgages.map((mortgage) => (
              <MortgagePanel
                key={mortgage.id}
                mortgage={mortgage}
                onChange={(changes) => updateMortgage(mortgage.id, changes)}
                title={mortgage.name}
                subtitle="Not attached to a property yet."
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
