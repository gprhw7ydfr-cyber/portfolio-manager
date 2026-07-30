import type { PropertyAsset } from "../../domain/property/PropertyAsset";
import { calculatePropertyYield } from "../../domain/property/calculatePropertyIncome";

interface PropertyCardProps {
  property: PropertyAsset;
  onSelect: () => void;
}

const money = (value: number) => value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

const typeLabel: Record<PropertyAsset["type"], string> = {
  "residential-property": "Residential",
  "commercial-property": "Commercial",
  "vacant-land": "Vacant land",
};

export function PropertyCard({ property, onSelect }: PropertyCardProps) {
  return (
    <button type="button" className="property-card" onClick={onSelect}>
      <span className="property-card__type">{typeLabel[property.type]}</span>
      <h3>{property.name}</h3>
      <p className="muted">{property.address || "No address yet"}</p>
      <strong className="property-card__value">{money(property.currentValue)}</strong>
      <span className="property-card__yield">{percent(calculatePropertyYield(property))} yield</span>
    </button>
  );
}
