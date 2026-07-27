import { useState } from "react";
import { usePortfolio } from "../../store/usePortfolio";
import { isPropertyAsset, type PropertyAsset } from "../../domain/property/PropertyAsset";
import type { MortgageLiability } from "../../domain/mortgage/MortgageLiability";
import type { Scenario } from "../../domain/scenario/Scenario";
import type { ReportData } from "../../domain/reporting/ReportData";
import { buildPortfolioSummaryReport } from "../../domain/reporting/buildPortfolioSummaryReport";
import { buildMortgageReport } from "../../domain/reporting/buildMortgageReport";
import { buildPropertyReport } from "../../domain/reporting/buildPropertyReport";
import { buildCashFlowReport } from "../../domain/reporting/buildCashFlowReport";
import { buildNetWorthReport } from "../../domain/reporting/buildNetWorthReport";
import { buildStrategyComparisonReport } from "../../domain/reporting/buildStrategyComparisonReport";
import { ReportView } from "./ReportView";

type ReportKind = "portfolio-summary" | "mortgage" | "property" | "cash-flow" | "net-worth" | "strategy-comparison";

const REPORT_CARDS: { kind: ReportKind; title: string; description: string }[] = [
  { kind: "portfolio-summary", title: "Portfolio Summary", description: "Net worth, cash flow, and interest at a glance." },
  { kind: "mortgage", title: "Mortgage Report", description: "Rates, repayments, and payoff dates per split." },
  { kind: "property", title: "Property Report", description: "Value, income, expenses, and improvements." },
  { kind: "cash-flow", title: "Cash Flow Report", description: "Income and expenses at every frequency." },
  { kind: "net-worth", title: "Net Worth Report", description: "Today's net worth, broken down by property and account." },
  { kind: "strategy-comparison", title: "Strategy Comparison", description: "Baseline vs. a saved strategy." },
];

export function ReportsHome() {
  const [portfolio] = usePortfolio();
  const [report, setReport] = useState<ReportData | null>(null);
  const [picker, setPicker] = useState<ReportKind | null>(null);

  const mortgages = portfolio.liabilities.filter((liability): liability is MortgageLiability => liability.type === "mortgage");
  const properties = portfolio.assets.filter(isPropertyAsset);
  const scenarios = portfolio.scenarios;

  const openMortgageReport = (liability: MortgageLiability) => {
    setReport(buildMortgageReport(liability, portfolio.assets));
    setPicker(null);
  };
  const openPropertyReport = (property: PropertyAsset) => {
    const attached = mortgages.find((mortgage) => mortgage.propertyId === property.id);
    setReport(buildPropertyReport(property, attached, portfolio.assets));
    setPicker(null);
  };
  const openStrategyReport = (scenario: Scenario) => {
    setReport(buildStrategyComparisonReport(portfolio, scenario));
    setPicker(null);
  };

  const handleCardClick = (kind: ReportKind) => {
    if (kind === "portfolio-summary") setReport(buildPortfolioSummaryReport(portfolio));
    else if (kind === "cash-flow") setReport(buildCashFlowReport(portfolio));
    else if (kind === "net-worth") setReport(buildNetWorthReport(portfolio));
    else if (kind === "mortgage") {
      if (mortgages.length === 1) openMortgageReport(mortgages[0]);
      else setPicker("mortgage");
    } else if (kind === "property") {
      if (properties.length === 1) openPropertyReport(properties[0]);
      else setPicker("property");
    } else if (kind === "strategy-comparison") {
      if (scenarios.length === 1) openStrategyReport(scenarios[0]);
      else setPicker("strategy-comparison");
    }
  };

  const isDisabled = (kind: ReportKind) => (kind === "mortgage" && mortgages.length === 0)
    || (kind === "property" && properties.length === 0)
    || (kind === "strategy-comparison" && scenarios.length === 0);

  const emptyMessage: Partial<Record<ReportKind, string>> = {
    mortgage: "Add a mortgage in Properties first.",
    property: "Add a property in Properties first.",
    "strategy-comparison": "Save a strategy in Strategies first.",
  };

  if (report) {
    return <ReportView report={report} onBack={() => setReport(null)} />;
  }

  if (picker === "mortgage") {
    return (
      <div className="reports-home">
        <button className="text-button" onClick={() => setPicker(null)}>&larr; Back to reports</button>
        <div className="calculator__heading"><div><p className="eyebrow">Mortgage Report</p><h2>Choose a mortgage.</h2></div></div>
        <div className="property-grid-list">
          {mortgages.map((mortgage) => (
            <button type="button" className="property-card" key={mortgage.id} onClick={() => openMortgageReport(mortgage)}>
              <h3>{mortgage.name}</h3>
              <p className="muted">{mortgage.splits.length} split{mortgage.splits.length === 1 ? "" : "s"}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (picker === "property") {
    return (
      <div className="reports-home">
        <button className="text-button" onClick={() => setPicker(null)}>&larr; Back to reports</button>
        <div className="calculator__heading"><div><p className="eyebrow">Property Report</p><h2>Choose a property.</h2></div></div>
        <div className="property-grid-list">
          {properties.map((property) => (
            <button type="button" className="property-card" key={property.id} onClick={() => openPropertyReport(property)}>
              <h3>{property.name}</h3>
              <p className="muted">{property.address || "No address yet"}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (picker === "strategy-comparison") {
    return (
      <div className="reports-home">
        <button className="text-button" onClick={() => setPicker(null)}>&larr; Back to reports</button>
        <div className="calculator__heading"><div><p className="eyebrow">Strategy Comparison</p><h2>Choose a strategy.</h2></div></div>
        <div className="property-grid-list">
          {scenarios.map((scenario) => (
            <button type="button" className="property-card" key={scenario.id} onClick={() => openStrategyReport(scenario)}>
              <h3>{scenario.name}</h3>
              <p className="muted">{scenario.assumptions.projectionYears}-year plan</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="reports-home">
      <section className="calculator">
        <div className="calculator__heading">
          <div>
            <p className="eyebrow">Reports</p>
            <h2>Generate a report.</h2>
            <p className="muted">Export as CSV, JSON, or print to PDF.</p>
          </div>
        </div>
        <div className="property-grid-list">
          {REPORT_CARDS.map((card) => (
            <button
              type="button"
              className="property-card"
              key={card.kind}
              disabled={isDisabled(card.kind)}
              onClick={() => handleCardClick(card.kind)}
            >
              <h3>{card.title}</h3>
              <p className="muted">{isDisabled(card.kind) ? emptyMessage[card.kind] : card.description}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
