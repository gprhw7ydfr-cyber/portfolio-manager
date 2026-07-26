import type { CashFlowItem, CashFlowKind, CashFlowFrequency, IncomeCategory, ExpenseCategory } from "../../domain/cashflow/CashFlowItem";
import { numberFromInput, selectIfZero } from "../../domain/shared/numericInput";

interface CashFlowItemRowProps {
  item: CashFlowItem;
  onChange: (changes: Partial<CashFlowItem>) => void;
  onDelete: () => void;
}

const incomeCategories: { value: IncomeCategory; label: string }[] = [
  { value: "salary", label: "Salary" },
  { value: "dividends", label: "Dividends" },
  { value: "interest", label: "Interest" },
  { value: "other", label: "Other" },
];

const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: "insurance", label: "Insurance" },
  { value: "living-costs", label: "Living costs" },
  { value: "maintenance", label: "Maintenance" },
  { value: "tax", label: "Tax" },
  { value: "other", label: "Other" },
];

export function CashFlowItemRow({ item, onChange, onDelete }: CashFlowItemRowProps) {
  const categories = item.kind === "income" ? incomeCategories : expenseCategories;

  const changeKind = (kind: CashFlowKind) => {
    const defaultCategory = kind === "income" ? incomeCategories[0].value : expenseCategories[0].value;
    onChange({ kind, category: defaultCategory });
  };

  return (
    <div className="cash-flow-rule">
      <label>
        <span>Name</span>
        <input aria-label="Item name" type="text" value={item.name} onChange={(event) => onChange({ name: event.target.value })} />
      </label>
      <label>
        <span>Type</span>
        <select aria-label="Income or expense" value={item.kind} onChange={(event) => changeKind(event.target.value as CashFlowKind)}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </label>
      <label>
        <span>Category</span>
        <select aria-label="Category" value={item.category} onChange={(event) => onChange({ category: event.target.value as IncomeCategory | ExpenseCategory })}>
          {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>
      </label>
      <label>
        <span>Amount</span>
        <span className="inline-control">
          <b>$</b>
          <input aria-label="Amount" type="number" min="0" step="10" value={item.amount} onFocus={selectIfZero(item.amount)} onChange={(event) => onChange({ amount: numberFromInput(item.amount, event.target.value) })} />
        </span>
      </label>
      <label>
        <span>Frequency</span>
        <select aria-label="Frequency" value={item.frequency} onChange={(event) => onChange({ frequency: event.target.value as CashFlowFrequency })}>
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
          <option value="annually">Annually</option>
        </select>
      </label>
      <button className="icon-button payment-rule__delete" title="Remove item" onClick={onDelete}>×</button>
    </div>
  );
}
