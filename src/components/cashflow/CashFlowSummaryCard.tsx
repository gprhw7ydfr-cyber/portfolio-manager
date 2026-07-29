import type { CashFlowSummary } from "../../domain/cashflow/calculateCashFlow";

interface CashFlowSummaryCardProps {
  summary: CashFlowSummary;
  eyebrow?: string;
  title?: string;
}

const money = (value: number) => value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });

const columns: { key: "weekly" | "fortnightly" | "monthly" | "annually"; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "fortnightly", label: "Fortnightly" },
  { key: "monthly", label: "Monthly" },
  { key: "annually", label: "Annually" },
];

export function CashFlowSummaryCard({ summary, eyebrow = "Cash flow", title = "Your consolidated position" }: CashFlowSummaryCardProps) {
  return (
    <section className="summary-card cash-flow-summary">
      <div className="summary-card__heading">
        <div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>
      </div>
      <table className="cash-flow-table">
        <thead>
          <tr>
            <th></th>
            {columns.map((column) => <th key={column.key}>{column.label}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Income</th>
            {columns.map((column) => <td key={column.key}>{money(summary.income[column.key])}</td>)}
          </tr>
          <tr>
            <th>Expenses</th>
            {columns.map((column) => <td key={column.key}>{money(summary.expenses[column.key])}</td>)}
          </tr>
          <tr className="cash-flow-table__net">
            <th>Net</th>
            {columns.map((column) => <td key={column.key}>{money(summary.net[column.key])}</td>)}
          </tr>
        </tbody>
      </table>
    </section>
  );
}
