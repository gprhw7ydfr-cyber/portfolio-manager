# Roadmap

Sequenced against [docs/Vision.md](docs/Vision.md). Each phase is scoped to ship something usable and to avoid re-architecting later phases — see "Foundations this phase requires" under each entry.

## Phase 0 — Mortgage Engine (in progress)

Loan splits (fixed/floating), automatic refixing, offset accounts with refix top-up transfers, revolving credit, recurring extra/lump-sum payments, daily-equivalent amortisation schedule per split, portfolio-level totals.

**Remaining before Phase 1:**
- Fix known bugs: duplicate-split naming ([MortgageCalculator.tsx](src/components/mortgage/MortgageCalculator.tsx)), offset top-up transfer loop bailing early ([SimulationRunner.ts](src/engines/SimulationRunner.ts))
- Enable `strict` TypeScript
- Remove dead scaffold classes (`Mortgage.ts`, `LoanSplit.ts`, `InterestRate.ts`, empty stubs) superseded by the interface-based domain model
- Make `SimulationRunner`'s recurring-payment/transaction lookups O(n) instead of O(n²) — this becomes load-bearing once Monte Carlo (Phase 6) runs thousands of simulations

## Phase 1 — Domain Foundations

Generalise the mortgage-only domain into the shape everything else builds on. This is the highest-leverage phase — get it wrong and later phases force rework.

- **Money/currency**: extend `Money` for multi-currency, configurable locale/day-count conventions (interest is currently monthly-equivalent, not true daily — needed for "Interest calculated daily" in Vision §5)
- **Ownership model**: `Entity` (Individual, Joint, Trust, Company, LTC, Partnership) and an ownership-percentage/entity link, reused by both Assets and Properties
- **Asset abstraction**: base `Asset` (name, purchase price/date, current value, growth assumption, notes, ownership) with `Property` as one concrete subtype and room for Cash/TermDeposit/Shares/ETF/etc.
- **Liability abstraction**: generalise `Mortgage` as one kind of `Liability` so the dashboard can sum liabilities without knowing loan-specific detail
- **Portfolio aggregate**: the root object holding assets, liabilities, entities — what gets persisted, scenario-forked, and simulated
- **Persistence**: versioned schema in `localStorage` now, structured so a later move to SQLite (Vision §14) is a storage-adapter swap, not a rewrite

## Phase 2 — Property Management

- Property CRUD: general info, ownership, income (rent, other), expenses (rates, insurance, maintenance, body corp, PM, utilities, other), capital improvements, document metadata
- Attach existing mortgages/splits to a property
- Replace the single-calculator screen with a property list/portfolio view

## Phase 3 — Cash Flow & Savings

- Income/expense items outside properties (salary, dividends, interest, other)
- Cash accounts (everyday, savings, term deposit): deposits, withdrawals, interest, automatic transfers
- Formalise the Offset Engine (Vision §6) as a linked account against one or more splits, generalising what Phase 0 built inline
- Consolidated cash flow report at weekly/fortnightly/monthly/annual granularity

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
