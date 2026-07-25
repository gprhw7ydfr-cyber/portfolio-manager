import MortgageCalculator from "./components/mortgage/MortgageCalculator";

function App() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "30px",
      }}
    >
      <h1>Portfolio Manager</h1>

      <MortgageCalculator />
    </main>
  );
}

export default App;