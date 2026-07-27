import type { Portfolio } from "../portfolio/Portfolio";
import type { ReportData, ReportSection } from "./ReportData";
import { isPropertyAsset } from "../property/PropertyAsset";
import { isCashAccount } from "../cash/CashAccount";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { currentBalanceAsOf } from "../mortgage/scheduleAsOf";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { calculateDashboardStats } from "../dashboard/calculateDashboardStats";
import { formatMoney } from "../shared/formatMoney";

/** A snapshot of net worth today, broken down by property/account — not a historical trend.
 *  The app has no time-series storage; forward-looking trends live in the Dashboard charts and
 *  Strategy Comparison instead. */
export function buildNetWorthReport(portfolio: Portfolio, asOf: Date = new Date()): ReportData {
  const stats = calculateDashboardStats(portfolio, asOf);

  const mortgageDebtByPropertyId = new Map<string, number>();
  for (const liability of portfolio.liabilities) {
    if (liability.type !== "mortgage" || !liability.propertyId) continue;
    const result = MortgageEngine.simulate(toMortgageInput(liability, portfolio.assets));
    const debt = result.splits.reduce((sum, split) => sum + currentBalanceAsOf(split.schedule, asOf), 0);
    mortgageDebtByPropertyId.set(liability.propertyId, (mortgageDebtByPropertyId.get(liability.propertyId) ?? 0) + debt);
  }

  const properties = portfolio.assets.filter(isPropertyAsset);
  const propertySection: ReportSection = {
    heading: "Property equity",
    rows: properties.map((property) => {
      const debt = mortgageDebtByPropertyId.get(property.id) ?? 0;
      return { label: property.name, value: formatMoney(property.currentValue - debt) };
    }),
  };

  const cashAccounts = portfolio.assets.filter(isCashAccount);
  const cashSection: ReportSection = {
    heading: "Cash accounts",
    rows: cashAccounts.map((account) => ({ label: account.name, value: formatMoney(account.currentValue) })),
  };

  return {
    title: "Net Worth Report",
    generatedAt: asOf.toISOString(),
    sections: [
      {
        heading: "Summary",
        rows: [
          { label: "Net worth", value: formatMoney(stats.netWorth) },
          { label: "Total assets", value: formatMoney(stats.totalAssets) },
          { label: "Total liabilities", value: formatMoney(stats.totalLiabilities) },
          { label: "Total equity", value: formatMoney(stats.totalEquity) },
        ],
      },
      ...(properties.length > 0 ? [propertySection] : []),
      ...(cashAccounts.length > 0 ? [cashSection] : []),
    ],
  };
}
