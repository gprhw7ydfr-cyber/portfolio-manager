import type { Portfolio } from "../portfolio/Portfolio";
import type { Scenario } from "./Scenario";
import type { BuyPropertyEvent, RefinanceEvent, IncreaseRepaymentsEvent } from "./StrategyEvent";
import { buyEventPropertyId, buyEventSplitId } from "./StrategyEvent";
import { isPropertyAsset } from "../property/PropertyAsset";
import { isCashAccount } from "../cash/CashAccount";
import type { MortgageSplit } from "../mortgage/MortgageSplit";
import type { MortgageInput, RepaymentFrequency } from "../mortgage/MortgageInput";
import { toMortgageInput } from "../mortgage/toMortgageInput";
import { MortgageEngine } from "../../engines/MortgageEngine";
import { annualSeriesForSchedule, valueAtYear, type YearPoint } from "../mortgage/annualSeries";
import { RateChangeEvent } from "../mortgage/events/RateChangeEvent";
import { PERIODS_PER_YEAR } from "../cashflow/calculateCashFlow";

export interface ProjectionYear {
  year: number;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  annualCashFlow: number;
  totalInterestPaid: number;
}

interface PropertyProjection {
  id: string;
  activeFromYear: number;
  /** Exclusive — the property no longer counts from this offset year on (sold). */
  activeToYear: number;
  baseValue: number;
  growthRate: number;
  rentPerWeek: number;
  otherIncomePerYear: number;
  expensesAnnual: number;
  valueBumps: { year: number; amount: number }[];
}

interface MortgageProjection {
  propertyId?: string;
  series: YearPoint[];
  activeFromYear: number;
  activeToYear: number;
  /** True only for a mortgage originated mid-projection by a buy-property event — its first active
   *  year has no "previous calendar year" balance to diff against, since the debt didn't exist yet. */
  originalPrincipal: number;
  isNewOrigination: boolean;
}

/** Jan 1 of the given offset year — every scenario event fires on this boundary, keeping the whole
 *  projection at clean annual resolution instead of drifting off today's day-of-year. */
const yearStart = (currentYear: number, offset: number): Date => new Date(currentYear + offset, 0, 1);

/** Coarse period-count from a split's own start date to a target date — precise enough to place
 *  a scenario event's effective year, not a substitute for the engine's own calendar math. */
function paymentNumberAtDate(startDate: Date, frequency: RepaymentFrequency, targetDate: Date): number {
  const periodDays = frequency === "monthly" ? 30.44 : frequency === "fortnightly" ? 14 : 7;
  const days = (targetDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(Math.round(days / periodDays), 1);
}

function combineSeries(seriesList: YearPoint[][]): YearPoint[] {
  const years = new Set<number>();
  for (const series of seriesList) for (const point of series) years.add(point.year);
  return [...years].sort((a, b) => a - b).map((year) => ({
    year,
    closingBalance: seriesList.reduce((sum, series) => sum + valueAtYear(series, year).closingBalance, 0),
    cumulativeInterest: seriesList.reduce((sum, series) => sum + valueAtYear(series, year).cumulativeInterest, 0),
  }));
}

/** Applies this scenario's flat rate override (if any) and any refinance/increase-repayments
 *  events targeting this split, then hands off to the unchanged mortgage engine. */
function buildWorkingSplit(
  split: MortgageSplit,
  scenario: Scenario,
  startDate: Date,
  frequency: RepaymentFrequency,
  currentYear: number,
  refinanceEvents: RefinanceEvent[],
  increaseEvents: IncreaseRepaymentsEvent[],
): MortgageSplit {
  const working: MortgageSplit = {
    ...split,
    events: [...(split.events ?? [])],
    recurringPayments: [...(split.recurringPayments ?? [])],
  };

  if (scenario.assumptions.mortgageRateOverride !== undefined) {
    working.annualInterestRate = scenario.assumptions.mortgageRateOverride;
    working.rateType = undefined;
    working.fixedRateSettings = undefined;
  }

  for (const event of refinanceEvents) {
    const paymentNumber = paymentNumberAtDate(startDate, frequency, yearStart(currentYear, event.year));
    working.events!.push(new RateChangeEvent(paymentNumber, event.annualInterestRate));
  }

  for (const event of increaseEvents) {
    working.recurringPayments!.push({
      id: event.id,
      kind: "extra",
      amount: event.amount,
      interval: event.interval,
      startDate: yearStart(currentYear, event.year).toISOString().slice(0, 10),
    });
  }

  return working;
}

function valueAtOffset(property: PropertyProjection, offsetYear: number): number {
  const yearsGrown = Math.max(offsetYear - property.activeFromYear, 0);
  const grown = property.baseValue * Math.pow(1 + property.growthRate, yearsGrown);
  const bumps = property.valueBumps.filter((bump) => bump.year <= offsetYear).reduce((sum, bump) => sum + bump.amount, 0);
  return grown + bumps;
}

/** Portfolio-wide, year-by-year projection. Mortgages are simulated by the real, unchanged
 *  engine and resampled onto a calendar-year grid the same way the Dashboard charts already do;
 *  strategy events layer on top as one-off value/cash adjustments and split-level overrides. */
export function projectPortfolio(portfolio: Portfolio, scenario: Scenario, asOf: Date = new Date()): ProjectionYear[] {
  const currentYear = asOf.getFullYear();
  const projectionYears = Math.max(scenario.assumptions.projectionYears, 0);

  const buyEvents = scenario.events.filter((event): event is BuyPropertyEvent => event.type === "buy-property");
  const refinanceEvents = scenario.events.filter((event): event is RefinanceEvent => event.type === "refinance");
  const increaseEvents = scenario.events.filter((event): event is IncreaseRepaymentsEvent => event.type === "increase-repayments");

  const mortgages: MortgageProjection[] = [];

  for (const liability of portfolio.liabilities) {
    if (liability.type !== "mortgage") continue;
    const startDate = new Date(`${liability.startDate}T00:00:00`);
    const workingSplits = liability.splits.map((split) => buildWorkingSplit(
      split,
      scenario,
      startDate,
      liability.frequency,
      currentYear,
      refinanceEvents.filter((event) => event.splitId === split.id),
      increaseEvents.filter((event) => event.splitId === split.id),
    ));
    const input = toMortgageInput({ ...liability, splits: workingSplits }, portfolio.assets);
    const result = MortgageEngine.simulate(input);
    mortgages.push({
      propertyId: liability.propertyId,
      series: combineSeries(result.splits.map((split) => annualSeriesForSchedule(split.schedule))),
      activeFromYear: 0,
      activeToYear: projectionYears + 1,
      originalPrincipal: liability.splits.reduce((sum, split) => sum + split.principal, 0),
      isNewOrigination: false,
    });
  }

  const oneOffCashByYear = new Map<number, number>();

  for (const event of buyEvents) {
    const startDate = yearStart(currentYear, event.year);
    const split: MortgageSplit = {
      id: buyEventSplitId(event),
      name: event.propertyName,
      principal: Math.max(event.price - event.deposit, 0),
      annualInterestRate: event.annualInterestRate,
      years: event.years,
    };
    const workingSplit = buildWorkingSplit(
      split,
      scenario,
      startDate,
      "monthly",
      currentYear,
      refinanceEvents.filter((refinance) => refinance.splitId === split.id),
      increaseEvents.filter((increase) => increase.splitId === split.id),
    );
    const input: MortgageInput = { frequency: "monthly", startDate, splits: [workingSplit] };
    const result = MortgageEngine.simulate(input);
    mortgages.push({
      propertyId: buyEventPropertyId(event),
      series: combineSeries(result.splits.map((s) => annualSeriesForSchedule(s.schedule))),
      activeFromYear: event.year,
      activeToYear: projectionYears + 1,
      originalPrincipal: split.principal,
      isNewOrigination: true,
    });
    oneOffCashByYear.set(event.year, (oneOffCashByYear.get(event.year) ?? 0) - event.deposit);
  }

  const properties: PropertyProjection[] = portfolio.assets.filter(isPropertyAsset).map((property) => ({
    id: property.id,
    activeFromYear: 0,
    activeToYear: projectionYears + 1,
    baseValue: property.currentValue,
    growthRate: (property.annualGrowthRate ?? scenario.assumptions.propertyGrowthRate) / 100,
    rentPerWeek: property.income.rentPerWeek,
    otherIncomePerYear: property.income.otherIncomePerYear,
    expensesAnnual: property.expenses.ratesPerYear + property.expenses.insurancePerYear + property.expenses.maintenancePerYear
      + property.expenses.bodyCorporatePerYear + property.expenses.propertyManagementPerYear
      + property.expenses.utilitiesPerYear + property.expenses.otherExpensesPerYear,
    valueBumps: [],
  }));

  for (const event of buyEvents) {
    properties.push({
      id: buyEventPropertyId(event),
      activeFromYear: event.year,
      activeToYear: projectionYears + 1,
      baseValue: event.price,
      growthRate: scenario.assumptions.propertyGrowthRate / 100,
      rentPerWeek: event.rentPerWeek,
      otherIncomePerYear: 0,
      expensesAnnual: 0,
      valueBumps: [],
    });
  }

  for (const event of scenario.events) {
    if (event.type !== "renovate") continue;
    const property = properties.find((candidate) => candidate.id === event.propertyId);
    if (!property) continue;
    property.valueBumps.push({ year: event.year, amount: event.expectedValueIncrease });
    oneOffCashByYear.set(event.year, (oneOffCashByYear.get(event.year) ?? 0) - event.cost);
  }

  for (const event of scenario.events) {
    if (event.type !== "sell-property") continue;
    const property = properties.find((candidate) => candidate.id === event.propertyId);
    const mortgage = mortgages.find((candidate) => candidate.propertyId === event.propertyId);
    if (!property) continue;

    const saleValue = valueAtOffset(property, event.year);
    const mortgageBalance = mortgage ? valueAtYear(mortgage.series, currentYear + event.year).closingBalance : 0;
    const sellingCosts = saleValue * (event.sellingCostsPercentage / 100);
    const proceeds = saleValue - mortgageBalance - sellingCosts;

    property.activeToYear = event.year;
    if (mortgage) mortgage.activeToYear = event.year;
    oneOffCashByYear.set(event.year, (oneOffCashByYear.get(event.year) ?? 0) + proceeds);
  }

  const cashAccounts = portfolio.assets.filter(isCashAccount);
  const [designated, ...otherAccounts] = cashAccounts;
  const designatedRate = (designated?.interestRate ?? 0) / 100;
  let designatedBalance = designated?.currentValue ?? 0;
  const otherAccountBases = otherAccounts.map((account) => ({
    base: account.currentValue,
    rate: (account.interestRate ?? 0) / 100,
  }));

  const otherAssetsValue = portfolio.assets
    .filter((asset) => !isPropertyAsset(asset) && !isCashAccount(asset))
    .reduce((sum, asset) => sum + asset.currentValue, 0);

  const years: ProjectionYear[] = [];

  for (let offset = 0; offset <= projectionYears; offset += 1) {
    const calendarYear = currentYear + offset;

    const activeProperties = properties.filter((p) => p.activeFromYear <= offset && offset < p.activeToYear);
    const totalPropertyValue = activeProperties.reduce((sum, p) => sum + valueAtOffset(p, offset), 0);

    const vacancyFactor = 1 - (scenario.assumptions.vacancyRate ?? 0) / 100;
    const propertyIncome = activeProperties.reduce((sum, p) => {
      const grown = Math.pow(1 + scenario.assumptions.rentalGrowthRate / 100, offset - p.activeFromYear);
      return sum + (p.rentPerWeek * PERIODS_PER_YEAR.weekly * vacancyFactor + p.otherIncomePerYear) * grown;
    }, 0);
    const propertyExpenses = activeProperties.reduce((sum, p) => {
      const grown = Math.pow(1 + scenario.assumptions.expenseInflationRate / 100, offset - p.activeFromYear);
      return sum + p.expensesAnnual * grown;
    }, 0);

    let totalMortgageDebt = 0;
    let mortgageRepayment = 0;
    let totalInterestPaid = 0;

    for (const mortgage of mortgages) {
      const isActive = mortgage.activeFromYear <= offset && offset < mortgage.activeToYear;
      if (isActive) {
        const current = valueAtYear(mortgage.series, calendarYear);
        const isOriginationYear = mortgage.isNewOrigination && offset === mortgage.activeFromYear;
        const previousInterest = isOriginationYear ? 0 : valueAtYear(mortgage.series, calendarYear - 1).cumulativeInterest;
        const previousBalance = isOriginationYear ? mortgage.originalPrincipal : valueAtYear(mortgage.series, calendarYear - 1).closingBalance;
        totalMortgageDebt += current.closingBalance;
        mortgageRepayment += (current.cumulativeInterest - previousInterest) + (previousBalance - current.closingBalance);
      }
      if (mortgage.activeFromYear <= offset) {
        const interestOffset = Math.min(offset, mortgage.activeToYear - 1);
        totalInterestPaid += valueAtYear(mortgage.series, currentYear + interestOffset).cumulativeInterest;
      }
    }

    const annualCashFlow = propertyIncome - propertyExpenses - mortgageRepayment;

    if (offset > 0) designatedBalance *= 1 + designatedRate;
    designatedBalance += annualCashFlow + (oneOffCashByYear.get(offset) ?? 0);
    const otherCash = otherAccountBases.reduce((sum, account) => sum + account.base * Math.pow(1 + account.rate, offset), 0);
    const totalCash = designatedBalance + otherCash;

    const totalAssets = totalPropertyValue + totalCash + otherAssetsValue;
    const totalLiabilities = totalMortgageDebt;

    years.push({
      year: calendarYear,
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      annualCashFlow,
      totalInterestPaid,
    });
  }

  return years;
}
