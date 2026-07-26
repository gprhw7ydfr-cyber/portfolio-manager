# Vision

A desktop/web application to model, analyse, and optimise an individual's property portfolio and related financial position.

Unlike conventional mortgage calculators, the software is intended to support strategic decision making by integrating assets, liabilities, cash flow, and long-term scenario modelling into a single application.

The software operates entirely offline, with all user data stored locally unless cloud functionality is added in a future version.

## 1. Design Philosophy

The application shall:

- Provide accurate financial modelling rather than simple repayment estimates.
- Be transparent, with calculations visible and explainable.
- Support both owner-occupied and investment properties.
- Scale from a single mortgage to a large property portfolio.
- Allow unlimited future expansion without major architectural changes.
- Be suitable for users in multiple countries through configurable assumptions.

## 2. Core Modules

### Dashboard

**Purpose**
Provide an immediate overview of the user's financial position.

**Displays**

- Net Worth
- Total Assets
- Total Liabilities
- Total Mortgage Debt
- Total Offset Balance
- Total Cash
- Total Equity
- Loan-to-Value Ratio
- Weekly Cash Flow
- Monthly Cash Flow
- Annual Cash Flow
- Total Interest Paid
- Forecast Interest Remaining
- Portfolio Return
- Passive Income
- FIRE Progress (optional)

**Graphs**

- Net Worth
- Debt Reduction
- Equity Growth
- Asset Allocation
- Cash Flow
- Property Values
- Interest Paid
- Loan Balance

## 3. Asset Management

Unlimited assets.

**Supported asset types**

- Residential Property
- Commercial Property
- Vacant Land
- Cash
- Term Deposits
- Shares
- ETFs
- Managed Funds
- Cryptocurrency (optional)
- Vehicles (optional)
- Collectables (optional)
- Other Assets

**Each asset stores**

- Name
- Purchase Price
- Purchase Date
- Current Value
- Growth Assumptions
- Notes
- Photos/Documents
- Ownership Percentage
- Ownership Entity

## 4. Property Management

**Each property stores**

**General**

- Address
- Nickname
- Purchase Date
- Purchase Price
- Current Value
- Estimated Market Value
- Property Type
- Floor Area
- Land Area
- Construction Year

**Ownership**

- Individual
- Joint Ownership
- Trust
- Company
- LTC
- Partnership

**Income**

- Rent
- Other Income

**Expenses**

- Rates
- Insurance
- Maintenance
- Body Corporate
- Property Management
- Utilities
- Other Expenses

**Capital Improvements**
Unlimited records

- Description
- Cost
- Date
- Expected value increase

**Documents**

- Purchase Agreement
- LIM
- Building Report
- Valuation
- Insurance
- Photos

## 5. Mortgage Engine

Unlimited mortgages. Unlimited loan splits per mortgage.

**Each split supports**

- Balance
- Interest Rate
- Fixed/Variable
- Remaining Term
- Payment Frequency
- Interest-only Period
- Offset Eligibility
- Redraw
- Revolving Credit
- Repayment Type

Interest calculated daily.

**Supports**

- Future rate changes
- Future repayment changes
- Lump sums
- Extra repayments
- Refinance events

**Outputs**

- Payoff Date
- Total Interest
- Effective Interest Rate
- Remaining Balance
- Amortisation Schedule

## 6. Offset Engine

Unlimited offset accounts.

**Supports**

- Daily balances
- Automatic transfers
- Savings plans
- Linked loan selection

**Calculates**

- Interest saved
- Effective mortgage balance
- Offset utilisation

## 7. Savings & Cash Management

**Accounts**

- Everyday
- Savings
- Term Deposits

**Tracks**

- Deposits
- Withdrawals
- Interest
- Automatic transfers
- Future balances

## 8. Cash Flow

**Income**

- Salary
- Rental
- Dividends
- Interest
- Other

**Expenses**

- Mortgage
- Rates
- Insurance
- Living Costs
- Maintenance
- Tax
- Other

**Reports**

- Weekly
- Fortnightly
- Monthly
- Annual

## 9. Strategy Simulator

**Purpose**
Evaluate financial strategies.

**Examples**

- Buy another property
- Sell property
- Renovate
- Increase repayments
- Build offset
- Refinance
- Debt recycling
- Invest elsewhere
- Split mortgage
- Change loan terms

**Outputs**

- Net Worth
- Equity
- Cash Flow
- Interest Saved
- Retirement Date
- Portfolio Growth

## 10. Scenario Manager

Unlimited scenarios.

**Each scenario stores**

- Interest assumptions
- Inflation
- Growth
- Rental increases
- Expenses
- Loan structure

**Compare**

- Net Worth
- Cash Flow
- Portfolio Value
- Debt
- Interest

## 11. Monte Carlo Simulation

**Randomise**

- Interest rates
- Inflation
- Property growth
- Rental growth
- Expenses
- Vacancy
- Maintenance

**Run**

- 100
- 1,000
- 10,000+

simulations.

**Outputs**

- Probability of success
- Worst case
- Best case
- Median outcome
- Risk metrics

## 12. Reporting

**Generate**

- Portfolio Summary
- Mortgage Report
- Property Report
- Cash Flow Report
- Net Worth Report
- Strategy Comparison

**Export**

- PDF
- CSV
- Excel
- JSON

## 13. User Interface

Modern responsive interface.

**Features**

- Light/Dark Mode
- Drag-and-drop dashboard widgets
- Interactive charts
- Keyboard shortcuts
- Search
- Filtering
- Print-friendly reports

## 14. Data Storage

**Primary**
Browser Local Storage (initially)

**Future**

- SQLite database
- Cloud Sync
- Optional automatic backup

## 15. Developer Mode

**Displays**

- Individual calculations
- Interest formulas
- Daily balances
- Amortisation breakdown
- Debug information

Useful for auditing calculations.

## 16. Goals

The application shall answer questions such as:

- How can I pay off my mortgage fastest?
- Which loan should receive extra repayments?
- Should I use offset or reduce principal?
- Should I refinance?
- Should I buy another property?
- What happens if rates rise 2%?
- Can I retire in 15 years?
- What is my projected net worth?
- Which strategy produces the highest long-term wealth?
- How resilient is my portfolio under different economic conditions?
