import MortgageCalculator from "./components/mortgage/MortgageCalculator";

function App() {
  return (
    <main>
      <header className="app-header">
        <h1>Portfolio Manager</h1>
        <span>New Zealand mortgage planner</span>
      </header>
      <MortgageCalculator />
    </main>
  );
}

export default App;
