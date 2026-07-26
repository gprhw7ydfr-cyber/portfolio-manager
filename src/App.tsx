import MortgageCalculator from "./components/mortgage/MortgageCalculator";
import { PortfolioProvider } from "./store/PortfolioContext";

function App() {
  return (
    <PortfolioProvider>
      <main>
        <header className="app-header">
          <h1>Portfolio Manager</h1>
          <span>New Zealand mortgage planner</span>
        </header>
        <MortgageCalculator />
      </main>
    </PortfolioProvider>
  );
}

export default App;
