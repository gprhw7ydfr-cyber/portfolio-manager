import { useState } from "react";
import { MortgageEngine } from "../../engines/MortgageEngine";
import type { RepaymentFrequency } from "../../domain/mortgage/MortgageInput";

export default function MortgageCalculator() {
  const [principal, setPrincipal] = useState(500000);
  const [rate, setRate] = useState(5.75);
  const [years, setYears] = useState(30);
  const [frequency, setFrequency] =
    useState<RepaymentFrequency>("monthly");

  const result = MortgageEngine.simulate({
    principal,
    annualInterestRate: rate,
    years,
    frequency,
  });

  return (
    <section>
      <h2>Mortgage Calculator</h2>

      <div>
        <label>Loan Amount</label>
        <br />
        <input
          type="number"
          value={principal}
          onChange={(e) => setPrincipal(Number(e.target.value))}
        />
      </div>

      <div>
        <label>Interest Rate (%)</label>
        <br />
        <input
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />
      </div>

      <div>
        <label>Loan Term (Years)</label>
        <br />
        <input
          type="number"
          value={years}
          onChange={(e) => setYears(Number(e.target.value))}
        />
      </div>

      <div>
        <label>Repayment Frequency</label>
        <br />
        <select
          value={frequency}
          onChange={(e) =>
            setFrequency(e.target.value as RepaymentFrequency)
          }
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      <hr />

      <h3>Results</h3>

      <p>
        <strong>Repayment:</strong>{" "}
        {result.repayment.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}
      </p>

      <p>
        <strong>Total Interest:</strong>{" "}
        {result.totalInterest.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}
      </p>

      <p>
        <strong>Total Repaid:</strong>{" "}
        {result.totalRepayment.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}
      </p>
    </section>
  );
}