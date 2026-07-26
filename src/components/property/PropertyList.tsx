import { useMemo } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import { isPropertyAsset, type PropertyAsset } from "../../domain/property/PropertyAsset";
import { createDefaultProperty } from "../../domain/property/createDefaultProperty";
import { isCashAccount } from "../../domain/cash/CashAccount";
import { createDefaultCashAccount } from "../../domain/cash/createDefaultCashAccount";
import { calculateCashFlow } from "../../domain/cashflow/calculateCashFlow";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import type { CashAccount } from "../../domain/cash/CashAccount";
import type { CashFlowItem } from "../../domain/cashflow/CashFlowItem";
import { PropertyCard } from "./PropertyCard";
import { MortgagePanel } from "../mortgage/MortgagePanel";
import { CashAccountCard } from "../cash/CashAccountCard";
import { CashFlowItemRow } from "../cashflow/CashFlowItemRow";
import { CashFlowSummaryCard } from "../cashflow/CashFlowSummaryCard";

interface PropertyListProps {
  onSelectProperty: (id: string) => void;
}

const createDefaultCashFlowItem = (kind: CashFlowItem["kind"]): CashFlowItem => ({
  id: crypto.randomUUID(),
  name: kind === "income" ? "Salary" : "Living costs",
  kind,
  category: kind === "income" ? "salary" : "living-costs",
  amount: 0,
  frequency: "fortnightly",
});

export function PropertyList({ onSelectProperty }: PropertyListProps) {
  const [portfolio, setPortfolio] = usePortfolio();

  const properties = portfolio.assets.filter(isPropertyAsset);
  const cashAccounts = portfolio.assets.filter(isCashAccount);
  const unattachedMortgages = portfolio.liabilities.filter(
    (liability): liability is MortgageLiability => liability.type === "mortgage" && !liability.propertyId,
  );
  const cashFlowSummary = useMemo(() => calculateCashFlow(portfolio), [portfolio]);

  const ownership = portfolio.entities.length > 0
    ? [{ entityId: portfolio.entities[0].id, percentage: 100 }]
    : [];

  const addProperty = () => {
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

  const addCashAccount = () => {
    const account = createDefaultCashAccount(`Account ${cashAccounts.length + 1}`, ownership);
    setPortfolio((current) => ({ ...current, assets: [...current.assets, account] }));
  };

  const updateCashAccount = (id: string, changes: Partial<CashAccount>) => {
    setPortfolio((current) => ({ ...current, assets: updateById(current.assets, id, changes) }));
  };

  const deleteCashAccount = (id: string) => {
    setPortfolio((current) => ({ ...current, assets: current.assets.filter((asset) => asset.id !== id) }));
  };

  const addCashFlowItem = (kind: CashFlowItem["kind"]) => {
    setPortfolio((current) => ({ ...current, cashFlowItems: [...current.cashFlowItems, createDefaultCashFlowItem(kind)] }));
  };

  const updateCashFlowItem = (id: string, changes: Partial<CashFlowItem>) => {
    setPortfolio((current) => ({ ...current, cashFlowItems: updateById(current.cashFlowItems, id, changes) }));
  };

  const deleteCashFlowItem = (id: string) => {
    setPortfolio((current) => ({ ...current, cashFlowItems: current.cashFlowItems.filter((item) => item.id !== id) }));
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
                cashAccounts={cashAccounts}
                onChange={(changes) => updateMortgage(mortgage.id, changes)}
                title={mortgage.name}
                subtitle="Not attached to a property yet."
              />
            ))}
          </div>
        </section>
      )}

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Savings &amp; cash</p>
            <h2>Cash accounts.</h2>
            <p className="muted">Everyday, savings, and term deposit accounts — link one to a split to offset a mortgage.</p>
          </div>
        </div>

        {cashAccounts.length === 0 ? (
          <p className="payment-plan__empty">No cash accounts yet.</p>
        ) : (
          <div className="split-list">
            {cashAccounts.map((account) => (
              <CashAccountCard
                key={account.id}
                account={account}
                onChange={(changes) => updateCashAccount(account.id, changes)}
                onDelete={() => deleteCashAccount(account.id)}
              />
            ))}
          </div>
        )}

        <button className="button button--secondary" onClick={addCashAccount}>+ Add account</button>
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Cash flow</p>
            <h2>Income &amp; expenses.</h2>
            <p className="muted">Items outside a property — salary, dividends, interest, insurance, living costs, tax, and more.</p>
          </div>
          <div className="payment-plan__buttons">
            <button className="text-button" onClick={() => addCashFlowItem("income")}>+ Income</button>
            <button className="text-button" onClick={() => addCashFlowItem("expense")}>+ Expense</button>
          </div>
        </div>

        {portfolio.cashFlowItems.length === 0 ? (
          <p className="payment-plan__empty">No income or expense items recorded.</p>
        ) : (
          <div className="payment-rules">
            {portfolio.cashFlowItems.map((item) => (
              <CashFlowItemRow
                key={item.id}
                item={item}
                onChange={(changes) => updateCashFlowItem(item.id, changes)}
                onDelete={() => deleteCashFlowItem(item.id)}
              />
            ))}
          </div>
        )}

        <CashFlowSummaryCard summary={cashFlowSummary} />
      </section>
    </div>
  );
}
