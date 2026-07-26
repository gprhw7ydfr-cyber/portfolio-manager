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
- **Portfolio-level `CashFlowItem[]`** (`src/domain/cashflow/CashFlowItem.ts`, new `Portfolio.cashFlowItems`) covers income/expenses outside properties (salary, dividends, interest, other income; insurance, living costs, maintenance, tax, other expenses) — record-keeping line items, not a simulated projection.
- **Offset accounts link to a real `CashAccount`**: `OffsetSettings.linkedAccountId?` resolved to `offsetBalance` one layer up in `toMortgageInput` (now accepting the portfolio's assets) — `SimulationRunner` itself needed **zero changes**. Verified the resolved balance produces identical interest figures to a manually-entered offset balance.
- **`calculateCashFlow`** (`src/domain/cashflow/calculateCashFlow.ts`) annualises `CashFlowItem`s, property income/expenses, and real mortgage repayments (via the engine, not a duplicated manual entry) onto one figure, then derives weekly/fortnightly/monthly/annual rows — rendered by `CashFlowSummaryCard` on the home screen.
- **Deferred**: real balance simulation (cash accounts stay manually-tracked, like property `currentValue`) and "automatic transfers" (nets to zero on a consolidated report; meaningful modelling needs the balance-projection work Phase 5/6 owns) — both explicitly scoped out with the user up front, not silently dropped.
- Backward compatibility: existing `localStorage` portfolios from Phase 1/2 sessions (predating `cashFlowItems`) are defaulted on load in `PortfolioStorage.ts` rather than breaking.

Verified: build/lint clean, math hand-checked against the UI (income/expense/net totals matched exactly), the offset-linking regression-tested against Phase 0's manual offset figures, and everything survives a reload — including on genuinely old pre-Phase-3 `localStorage` data.

## Phase 4 — Dashboard

Net worth, total assets/liabilities/debt/offset/cash/equity, LVR, cash flow (weekly/monthly/annual), interest paid/forecast remaining, portfolio return, passive income. Charts: net worth, debt reduction, equity growth, asset allocation, cash flow, property values, interest paid, loan balance.

This phase is deliberately after 1–3: the numbers it displays are aggregates over assets/liabilities/cash flow, so it's cheap once those exist and hollow before.

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
