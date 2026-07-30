import { useMemo } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import { updateById } from "../../domain/shared/updateById";
import { isPropertyAsset, type PropertyAsset } from "../../domain/property/PropertyAsset";
import { createDefaultProperty } from "../../domain/property/createDefaultProperty";
import { isCashAccount } from "../../domain/cash/CashAccount";
import { createDefaultCashAccount } from "../../domain/cash/createDefaultCashAccount";
import { calculateCashFlow } from "../../domain/cashflow/calculateCashFlow";
import { calculateDashboardCharts } from "../../domain/dashboard/calculateDashboardCharts";
import { annualNetOperatingIncome } from "../../domain/property/calculatePropertyIncome";
import type { CashAccount } from "../../domain/cash/CashAccount";
import { PropertyCard } from "./PropertyCard";
import { CashAccountCard } from "../cash/CashAccountCard";
import { CashFlowSummaryCard } from "../cashflow/CashFlowSummaryCard";
import { ResultCard } from "../mortgage/ResultCard";
import { TrendLineChart } from "../dashboard/TrendLineChart";
import { getCategorical } from "../dashboard/chartPalette";
import { useTheme } from "../../store/useTheme";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

interface PropertyListProps {
  onSelectProperty: (id: string) => void;
}

export function PropertyList({ onSelectProperty }: PropertyListProps) {
  const [portfolio, setPortfolio] = usePortfolio();
  const [theme] = useTheme();
  const categorical = getCategorical(theme);

  const properties = portfolio.assets.filter(isPropertyAsset);
  const cashAccounts = portfolio.assets.filter(isCashAccount);
  const cashFlowSummary = useMemo(() => calculateCashFlow(portfolio), [portfolio]);
  const charts = useMemo(() => calculateDashboardCharts(portfolio), [portfolio]);
  const totalPropertyValue = properties.reduce((sum, property) => sum + property.currentValue, 0);
  const totalNoi = properties.reduce((sum, property) => sum + annualNetOperatingIncome(property), 0);
  const consolidatedYield = totalPropertyValue > 0 ? totalNoi / totalPropertyValue : 0;

  const ownership = portfolio.entities.length > 0
    ? [{ entityId: portfolio.entities[0].id, percentage: 100 }]
    : [];

  const addProperty = () => {
    const property = createDefaultProperty(`Property ${properties.length + 1}`, ownership);
    setPortfolio((current) => ({ ...current, assets: [...current.assets, property] }));
    onSelectProperty(property.id);
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
            <h2>Your property portfolio's cash flow.</h2>
            <p className="muted">Rent and expenses across every property, plus mortgage repayments.</p>
          </div>
        </div>
        <div className="dashboard-stats">
          <ResultCard label="Consolidated gross rental yield" value={percent(consolidatedYield)} supportingText="Net operating income / total property value" />
        </div>
        <CashFlowSummaryCard summary={cashFlowSummary} />
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div><p className="eyebrow">Mortgages</p><h2>Loan balance over time.</h2></div>
        </div>
        <TrendLineChart points={charts.loanBalanceSeries} color={categorical.blue} seriesLabel="Loan balance" />
      </section>

      <section className="calculator other-mortgages">
        <div className="calculator__heading">
          <div><p className="eyebrow">Mortgages</p><h2>Interest paid over time.</h2></div>
        </div>
        <TrendLineChart points={charts.interestPaidSeries} color={categorical.orange} seriesLabel="Cumulative interest paid" />
      </section>
    </div>
  );
}
