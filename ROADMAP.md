# Roadmap

Sequenced against [docs/Vision.md](docs/Vision.md). Each phase is scoped to ship something usable and to avoid re-architecting later phases — see "Foundations this phase requires" under each entry.

## Phase 0 — Mortgage Engine (done)

Loan splits (fixed/floating), automatic refixing, offset accounts with refix top-up transfers, revolving credit, recurring extra/lump-sum payments, daily-equivalent amortisation schedule per split, portfolio-level totals.

**Gaps against Vision §5** (Mortgage Engine) found on review, not yet covered above:
- Interest is periodic-equivalent (`annualRate / periodsPerYear` applied per payment), not true day-count accrual — Vision §5 specifies "Interest calculated daily," and this is core simulation math, not a UI nicety
- No Interest-Only period or Repayment Type field on `MortgageSplit`/`MortgageProduct`
- No refinance event (only `RateChangeEvent`/`BalanceAdjustmentEvent` exist)
- No "Effective Interest Rate" output on `MortgageResult`
- Offset balance is static for the life of the loan — no accrual, no ongoing deposits modelled; needs an explicit decision on whether that's intended v1 scope

**Do now, before Phase 1** — either quick cleanup or touches the simulation core that Phase 1's `Liability` abstraction will be built around, so worth getting right once rather than migrating broken math twice:
- Fix known bugs: duplicate-split naming ([MortgageCalculator.tsx](src/components/mortgage/MortgageCalculator.tsx)), offset top-up transfer loop bailing early ([SimulationRunner.ts](src/engines/SimulationRunner.ts))
- Enable `strict` TypeScript
- Remove dead scaffold classes (`Mortgage.ts`, `LoanSplit.ts`, `InterestRate.ts`, empty stubs) superseded by the interface-based domain model
- Make `SimulationRunner`'s recurring-payment/transaction lookups O(n) instead of O(n²) — this becomes load-bearing once Monte Carlo (Phase 6) runs thousands of simulations
- Switch interest accrual to daily/day-count
- Memoise the `MortgageEngine.simulate()` call in the UI so typing doesn't re-run the full amortisation on every keystroke

**Defer to just after Phase 1** — additive fields that would just get reshaped again once the generic `Liability` type lands, so build them on that shape directly instead of on `MortgageSplit` twice:
- Interest-Only period, Repayment Type field
- Refinance event, effective-rate output

**Post-Phase-4 engine enhancement** — general refix redistribution, requested once Phases 1–4 made "compare repayment strategies" a concrete goal:
- `RefixBalanceTarget` (`src/domain/mortgage/RefixBalanceTarget.ts`) lets *any* split opt into a value, percentage-of-mortgage, or weighted-share-of-remainder target; `SimulationRunner` resolves every participating split's target at each refix and nets out whatever transfers (either direction) are needed to hit them — a real rebalance, not the old one-directional "drain sources to top up one offset split." Replaces `OffsetSettings.maintainLoanBalanceAtRefix`/`refixLoanBalanceTarget`.
- Found and fixed along the way: the day-count interest engine (Phase 0) didn't exactly match the periodic-rate annuity formula sizing the level repayment, so a fully-amortising loan could finish its scheduled term with a small non-zero residual (e.g. $270 on a $100k/30yr loan) instead of $0 — invisible until a new "loan completion date" stat made it visible. The final scheduled payment now truncates to clear the balance exactly, like a real payoff statement.
- `MortgageSummary.payoffDate` — the mortgage's overall completion date, shown on `SummaryCard`; undefined (shown as "—") unless every split actually reaches zero (e.g. absent if a revolving-credit split is present).
- **Extra payment advisor** (`src/domain/mortgage/recommendExtraPayment.ts`, shown on `MortgagePanel`): answers "which split should extra money go to?" by literally re-simulating each candidate split with a test lump sum applied and comparing total interest against a baseline — not a nominal-rate heuristic, which would wrongly favour a fully-offset split's high paper rate over its near-zero effective cost. Confirmed by test: a fully-offset split at 8% correctly shows $0 saved against a plain 5% P&I split showing real savings. Stops short of a full multi-split optimizer (search across ways to divide the amount) — that stays Phase 5/6 territory.

## Phase 1 — Domain Foundations (done)

Generalise the mortgage-only domain into the shape everything else builds on. This is the highest-leverage phase — get it wrong and later phases force rework.

- **Money/currency**: `Money` (`src/domain/money/Money.ts`) now carries a currency (default NZD) through its factories and arithmetic, and throws on cross-currency `add`/`subtract`. Day-count itself landed in Phase 0.
- **Ownership model**: `OwnershipEntity` (`src/domain/shared/OwnershipEntity.ts`, Individual/Joint/Trust/Company/LTC/Partnership) and `OwnershipStake` (`src/domain/shared/Ownership.ts`), reused by both Assets and Liabilities
- **Asset abstraction**: `AssetBase`/`Asset` union (`src/domain/asset/Asset.ts`) with one concrete `OtherAsset` member proving the pattern — Property/Cash/Shares/etc. join as Phase 2/3 design their own fields
- **Liability abstraction**: `LiabilityBase`/`Liability` union (`src/domain/liability/Liability.ts`) with `MortgageLiability` (`src/domain/mortgage/MortgageLiability.ts`) as the concrete type — introduces the "unlimited mortgages, each with unlimited splits" grouping the Vision calls for, wrapping the existing `MortgageSplit[]` untouched
- **Portfolio aggregate**: `Portfolio` (`src/domain/portfolio/Portfolio.ts`) — entities/assets/liabilities, plain serializable data, no methods
- **Persistence**: `src/services/PortfolioStorage.ts` (versioned `{schemaVersion, portfolio}` localStorage read/write) behind `src/store/PortfolioContext.tsx` + `usePortfolio()` — the only two functions that know about `localStorage`, so a future SQLite move is a storage-adapter swap, not a rewrite

`MortgageCalculator` now reads/writes through `usePortfolio()` instead of local `useState`, via a `toMortgageInput` adapter — `SimulationRunner`/`MortgageEngine` needed zero changes. Verified: build/lint clean, no visible regression in the UI, and edits now survive a page reload.

## Phase 2 — Property Management (done)

- **`PropertyAsset`** (`src/domain/property/PropertyAsset.ts`) joins the `Asset` union — general info, ownership (inherited from `AssetBase`), income (rent, other), expenses (rates, insurance, maintenance, body corp, PM, utilities, other — simple numeric fields, not a recurring-payment engine; that's Phase 3's job), and `capitalImprovements: CapitalImprovement[]` with full CRUD
- **Mortgages attach to a property by reference**: `MortgageLiability.propertyId?: string`, optional so unattached mortgages (like the Phase 1 seed) keep working with no forced migration
- **`MortgageCalculator` became `MortgagePanel`**, a presentational `{ mortgage, onChange }` component reused both inside a property's detail view and in a home-screen "Other mortgages" section for anything unattached — zero changes to `SimulationRunner`/`MortgageEngine`
- **New home screen**: `PropertyList` (property cards + "Other mortgages") and `PropertyDetail`, navigated via simple in-app view state in `App.tsx` (no router — not needed for a single-user offline app yet)
- **Deferred**: Documents/photos (Vision §4) — real file storage needs IndexedDB, a meaningfully different capability than anything built so far; revisit in a later phase

Verified: build/lint clean, no regression against the Phase 0/1 baseline, and a property + capital improvement + mortgage attachment all survive a page reload.

## Phase 3 — Cash Flow & Savings (done)

- **`CashAccount`** (`src/domain/cash/CashAccount.ts`) joins the `Asset` union — everyday/savings/term-deposit, reusing `AssetBase.currentValue` as the balance. `AssetType`'s Phase-1 placeholder `"cash"` was refined into `"everyday" | "savings"` now that this module actually designed the shape.
- **Offset accounts link to a real `CashAccount`**: `OffsetSettings.linkedAccountId?` resolved to `offsetBalance` one layer up in `toMortgageInput` (now accepting the portfolio's assets) — `SimulationRunner` itself needed **zero changes**. Verified the resolved balance produces identical interest figures to a manually-entered offset balance.
- **`calculateCashFlow`** (`src/domain/cashflow/calculateCashFlow.ts`) annualises property income/expenses and real mortgage repayments (via the engine, not a duplicated manual entry) onto one figure, then derives weekly/fortnightly/monthly/annual rows — rendered by `CashFlowSummaryCard` on the home screen.
- **Deferred**: real balance simulation (cash accounts stay manually-tracked, like property `currentValue`) and "automatic transfers" (nets to zero on a consolidated report; meaningful modelling needs the balance-projection work Phase 5/6 owns) — both explicitly scoped out with the user up front, not silently dropped.
- **Reversed after shipping**: this phase originally also added portfolio-level `CashFlowItem[]` (salary, dividends, outside interest, other income; insurance, living costs, tax, other expenses — items not tied to a property). The user later decided to keep the whole project scoped to property/investment business rather than personal finances, so this was removed entirely — `Portfolio.cashFlowItems`, the domain type, the "Income & Expenses" UI section, and its contribution to `calculateCashFlow`/`passiveIncomeAnnual`. The consolidated cash flow position (and the Dashboard's Passive Income stat) is property + mortgage only, by design, going forward.

Verified: build/lint clean, math hand-checked against the UI (income/expense/net totals matched exactly), the offset-linking regression-tested against Phase 0's manual offset figures, and everything survives a reload — including on genuinely old pre-Phase-3 `localStorage` data.

## Phase 4 — Dashboard (done)

- **`calculateDashboardStats`** (`src/domain/dashboard/calculateDashboardStats.ts`) computes all 15 non-optional stats (net worth, total assets/liabilities/mortgage debt/offset/cash/equity, LVR, weekly/monthly/annual cash flow via `calculateCashFlow`, total interest paid, forecast interest remaining, portfolio return, passive income) from a `Portfolio` plus a real wall-clock "as of" date — the first place in the app that distinction matters, splitting each mortgage's amortisation schedule into paid-so-far vs. still-ahead.
- **`calculateDashboardCharts`** (`src/domain/dashboard/calculateDashboardCharts.ts`) supplies the four charts computable from data that exists today — Asset Allocation, Property Values, Loan Balance and cumulative Interest Paid over time (the latter two resampled onto a shared calendar-year grid across every mortgage split, since schedules differ in frequency/start/length). Net Worth / Debt Reduction / Equity Growth over time are deferred — genuine multi-year trend charts need forward growth simulation across all assets, which is Phase 5/6's job.
- **FIRE Progress skipped** (Vision marks it optional; needs a withdrawal-rate assumption nothing else in the app asks for). Portfolio Return is defined as gross rental yield, labelled as such rather than implying true time-weighted investment return.
- Chart components (`src/components/dashboard/`) built per the `dataviz` skill: inline SVG, the skill's validated reference categorical/sequential palette (fixed asset-type → color mapping so a category never repaints), hover tooltips + crosshair on the trend lines, always-visible legends (no value gated behind hover).
- **Dashboard is now the home screen** (`src/App.tsx` gained a `view` state + simple nav); Properties (property list, cash accounts, income/expenses — all Phase 2/3 work, unchanged) sits one click away.

Verified: build/lint clean; every stat hand-reconciled exactly against known portfolio state (including the paid+remaining-interest identity check landing on Phase 0/3's already-verified offset figures); charts checked with real data and with an empty portfolio (no NaN/Infinity — LVR and Portfolio Return guard the zero-property case).

## Phase 5 — Strategy Simulator & Scenario Manager

- Model strategy actions (buy/sell property, renovate, increase repayments, build offset, refinance, debt recycle, invest elsewhere, split mortgage, change terms) as timeline events, extending the `MortgageEvent` pattern from Phase 0 to portfolio-level events
- Scenario Manager: named bundles of assumptions (rates, inflation, growth, rental increases, expenses, loan structure), run side by side, compared on net worth/cash flow/portfolio value/debt/interest

## Phase 6 — Monte Carlo Simulation

Randomise rates, inflation, growth, rental growth, expenses, vacancy, maintenance across 100–10,000+ runs of the Phase 5 simulation; report probability of success, best/worst/median, risk metrics. Depends on the Phase 0 performance work — this is where an O(n²) inner loop becomes an O(n · runs) problem.

## Phase 7 — Reporting & Export

Portfolio Summary, Mortgage Report, Property Report, Cash Flow Report, Net Worth Report, Strategy Comparison. Export to PDF/CSV/Excel/JSON.

## Phase 8 — UI Polish & Developer Mode

Light/dark mode, drag-and-drop dashboard widgets, keyboard shortcuts, search/filter, print-friendly reports. Developer Mode exposing calculation internals (formulas, daily balances, amortisation breakdown) for auditing — worth threading through earlier phases incrementally rather than bolting on at the end.

## Later / not yet scoped

Cloud sync, SQLite migration, crypto/vehicle/collectables asset types, FIRE progress metric, collaboration support (multi-user) — deferred until the single-user offline core (Phases 0–8) is solid, per the Vision's "operates entirely offline... unless cloud functionality is added in a future version."
