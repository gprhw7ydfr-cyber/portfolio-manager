function App() {
  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      <header>
        <h1>Portfolio Manager</h1>
        <p>Version 0.1.0</p>
      </header>

      <hr />

      <section>
        <h2>Dashboard</h2>

        <p>
          Welcome to Portfolio Manager.
        </p>

        <p>
          Build, analyse and optimise mortgages, investment properties and
          complete financial portfolios.
        </p>
      </section>

      <hr />

      <section>
        <h2>Roadmap</h2>

        <ul>
          <li>Mortgage Engine</li>
          <li>Portfolio Management</li>
          <li>Strategy Simulator</li>
          <li>Scenario Comparison</li>
          <li>Reporting</li>
          <li>Collaboration</li>
        </ul>
      </section>
    </main>
  );
}

export default App;