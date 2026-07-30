import type { Portfolio } from "../portfolio/Portfolio";
import type { Scenario } from "./Scenario";
import type { BuyPropertyEvent, RefinanceEvent, IncreaseRepaymentsEvent } from "./StrategyEvent";
import { buyEventPropertyId, buyEventSplitId } from "./StrategyEvent";
import { isPropertyAsset } from "../property/PropertyAsset";
import { occupancyFraction } from "../property/calculatePropertyIncome";
import { estimateCashInvested } from "../dashboard/calculateInvestmentMetrics";
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
  /** Weeks this year's `annualCashFlow` actually represents — 52 for a normal full year; less only
   *  for the projection's first year (offset 0), when some active property was purchased partway
   *  through the current calendar year, so a plain /52 for a "weekly" view would understate the real
   *  week-to-week rate. Approximated as the most conservative (smallest) ownership fraction among
   *  that year's active properties, rounded to whole weeks — exact for a single-property portfolio. */
  weeksInYear: number;
  totalPropertyValue: number;
  /** Net operating income ÷ total property value — same definition as `calculateDashboardStats.ts`'s
   *  "Gross rental yield" and `calculatePropertyYield` (`calculatePropertyIncome.ts`). 0 when there's
   *  no property value yet. */
  grossRentalYield: number;
  /** Net operating income ÷ that year's mortgage repayment. 0 when there's no debt service that
   *  year — same "0 = no mortgage" convention as `calculateInvestmentMetrics.ts`'s `InvestmentMetrics.dscr`. */
  dscr: number;
  /** That year's annual cash flow ÷ `cashInvestedBaseline` (today's real cash invested, held constant
   *  across the whole projection — see `cashInvestedBaseline` below). 0 when nothing's invested yet. */
  cashOnCashReturn: number;
  /** Cumulative gain since the projection's first year ÷ `cashInvestedBaseline` — the same "gain ÷
   *  cash invested" shape as `calculatePortfolioInvestmentMetrics`'s ROI figures, extended to a full
   *  year-by-year series using each year's actual projected net worth instead of one end-of-horizon
   *  number. 0 when nothing's invested yet. */
  cumulativeRoi: number;
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
  /** Fraction of the CURRENT calendar year (offset 0 only) this property has actually earned income/
   *  incurred expenses for — an existing property purchased partway through this year shouldn't be
   *  credited a full 12 months of rent against, say, a mortgage whose own schedule (correctly) only
   *  covers the months since it actually originated. Always 1 for a buy-property-event property,
   *  since its construction already treats the buy as happening on Jan 1 of its own origination year. */
  currentYearOwnershipFraction: number;
  /** This property's own baseline vacancy assumption (smoothed evenly across the year) — 1 (fully
   *  occupied) for a buy-property-event property, which has no `PropertyAsset`/vacancy field of its
   *  own. Stacks multiplicatively with the scenario's own `vacancyRate`, if set — the property's own
   *  realistic baseline times an optional additional "what if vacancy is worse than usual" stress. */
  propertyOccupancyFraction: number;
}

interface MortgageProjection {
  propertyId?: string;
  series: YearPoint[];
  activeFromYear: number;
  activeToYear: number;
  /** Fallback "previous balance" for a year whose prior calendar year predates this mortgage's
   *  own series (a buy-property-event origination, or — just as real — an existing liability
   *  whose own startDate falls within the current projection's first calendar year), since there's
   *  no actual prior-year balance to diff against in either case. */
  originalPrincipal: number;
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

/** 1 for a property purchased before `currentYear` (the common case, and always true a year or
 *  more into any projection); less than 1 if purchased partway through `currentYear` itself. */
function currentYearOwnershipFraction(purchaseDate: string, currentYear: number): number {
  const purchased = new Date(`${purchaseDate}T00:00:00`);
  const yearStartDate = new Date(currentYear, 0, 1);
  const yearEndDate = new Date(currentYear, 11, 31);
  if (purchased <= yearStartDate) return 1;
  if (purchased > yearEndDate) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysInYear = Math.round((yearEndDate.getTime() - yearStartDate.getTime()) / msPerDay) + 1;
  const daysOwnedThisYear = Math.round((yearEndDate.getTime() - purchased.getTime()) / msPerDay) + 1;
  return Math.max(0, Math.min(1, daysOwnedThisYear / daysInYear));
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

  const substituteMortgageScenario = scenario.assumptions.mortgageScenarioId
    ? portfolio.mortgageScenarios.find((candidate) => candidate.id === scenario.assumptions.mortgageScenarioId)
    : undefined;

  if (substituteMortgageScenario) {
    // Stands in for the portfolio's ENTIRE real mortgage debt, not a per-property merge — a
    // portfolio can have several properties each with their own real mortgage, and there's no
    // natural 1:1 mapping onto one hypothetical structure. Not tied to a propertyId, so a
    // sell-property event won't reduce it; this feature is about the overall lending shape, not
    // per-property tracking.
    const startDate = new Date(`${substituteMortgageScenario.startDate}T00:00:00`);
    const workingSplits = substituteMortgageScenario.splits.map((split) => buildWorkingSplit(
      split,
      scenario,
      startDate,
      substituteMortgageScenario.frequency,
      currentYear,
      refinanceEvents.filter((event) => event.splitId === split.id),
      increaseEvents.filter((event) => event.splitId === split.id),
    ));
    const input = toMortgageInput({ ...substituteMortgageScenario, splits: workingSplits }, portfolio.assets);
    const result = MortgageEngine.simulate(input);
    mortgages.push({
      propertyId: undefined,
      series: combineSeries(result.splits.map((split) => annualSeriesForSchedule(split.schedule))),
      activeFromYear: 0,
      activeToYear: projectionYears + 1,
      originalPrincipal: substituteMortgageScenario.splits.reduce((sum, split) => sum + split.principal, 0),
    });
  } else {
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
      });
    }
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
    currentYearOwnershipFraction: currentYearOwnershipFraction(property.purchaseDate, currentYear),
    propertyOccupancyFraction: occupancyFraction(property),
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
      currentYearOwnershipFraction: 1,
      propertyOccupancyFraction: 1,
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

  // Held constant across the whole projection — same simplification
  // `calculatePortfolioInvestmentMetrics`'s own forward-projection ROI already makes. Capital
  // injected later via buy-property events' deposits isn't added to this denominator.
  const cashInvestedBaseline = portfolio.assets
    .filter(isPropertyAsset)
    .reduce((sum, property) => sum + (property.cashInvested ?? estimateCashInvested(property, portfolio)), 0);

  const years: ProjectionYear[] = [];

  for (let offset = 0; offset <= projectionYears; offset += 1) {
    const calendarYear = currentYear + offset;

    const activeProperties = properties.filter((p) => p.activeFromYear <= offset && offset < p.activeToYear);
    const totalPropertyValue = activeProperties.reduce((sum, p) => sum + valueAtOffset(p, offset), 0);

    const vacancyFactor = 1 - (scenario.assumptions.vacancyRate ?? 0) / 100;
    const propertyIncome = activeProperties.reduce((sum, p) => {
      const grown = Math.pow(1 + scenario.assumptions.rentalGrowthRate / 100, offset - p.activeFromYear);
      const ownershipFraction = offset === 0 ? p.currentYearOwnershipFraction : 1;
      return sum + (p.rentPerWeek * PERIODS_PER_YEAR.weekly * vacancyFactor * p.propertyOccupancyFraction + p.otherIncomePerYear) * grown * ownershipFraction;
    }, 0);
    const propertyExpenses = activeProperties.reduce((sum, p) => {
      const grown = Math.pow(1 + scenario.assumptions.expenseInflationRate / 100, offset - p.activeFromYear);
      const ownershipFraction = offset === 0 ? p.currentYearOwnershipFraction : 1;
      return sum + p.expensesAnnual * grown * ownershipFraction;
    }, 0);

    let totalMortgageDebt = 0;
    let mortgageRepayment = 0;
    let totalInterestPaid = 0;

    for (const mortgage of mortgages) {
      const isActive = mortgage.activeFromYear <= offset && offset < mortgage.activeToYear;
      if (isActive) {
        const current = valueAtYear(mortgage.series, calendarYear);
        // Whenever the prior calendar year predates this mortgage's own series — a buy-property-event
        // origination, or an existing liability whose startDate falls within the current projection's
        // first year — there's no real "previous balance" to diff against, so fall back to the original
        // principal rather than the incorrectly-clamped 0 valueAtYear would otherwise return.
        const hasPriorYearData = mortgage.series.length > 0 && calendarYear - 1 >= mortgage.series[0].year;
        const previousInterest = hasPriorYearData ? valueAtYear(mortgage.series, calendarYear - 1).cumulativeInterest : 0;
        const previousBalance = hasPriorYearData ? valueAtYear(mortgage.series, calendarYear - 1).closingBalance : mortgage.originalPrincipal;
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

    const weeksInYear = offset === 0 && activeProperties.length > 0
      ? Math.max(1, Math.round(52 * Math.min(...activeProperties.map((p) => p.currentYearOwnershipFraction))))
      : 52;

    const netWorth = totalAssets - totalLiabilities;
    const noiAnnual = propertyIncome - propertyExpenses;
    const grossRentalYield = totalPropertyValue > 0 ? noiAnnual / totalPropertyValue : 0;
    const dscr = mortgageRepayment > 0 ? noiAnnual / mortgageRepayment : 0;
    const cashOnCashReturn = cashInvestedBaseline > 0 ? annualCashFlow / cashInvestedBaseline : 0;
    const cumulativeRoi = cashInvestedBaseline > 0 ? (netWorth - (years[0]?.netWorth ?? netWorth)) / cashInvestedBaseline : 0;

    years.push({
      year: calendarYear,
      netWorth,
      totalAssets,
      totalLiabilities,
      annualCashFlow,
      totalInterestPaid,
      weeksInYear,
      totalPropertyValue,
      grossRentalYield,
      dscr,
      cashOnCashReturn,
      cumulativeRoi,
    });
  }

  return years;
}
