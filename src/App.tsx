import { useState } from "react";
import { PortfolioProvider } from "./store/PortfolioContext";
import { ThemeProvider } from "./store/ThemeContext";
import { useTheme } from "./store/useTheme";
import { DeveloperModeProvider } from "./store/DeveloperModeContext";
import { useDeveloperMode } from "./store/useDeveloperMode";
import { Dashboard } from "./components/dashboard/Dashboard";
import { PropertyList } from "./components/property/PropertyList";
import { PropertyDetail } from "./components/property/PropertyDetail";
import { ScenarioList } from "./components/scenario/ScenarioList";
import { MortgageScenarioList } from "./components/mortgageScenario/MortgageScenarioList";
import { ReportsHome } from "./components/reporting/ReportsHome";

type View = "dashboard" | "properties" | "strategies" | "mortgage-lab" | "reports";

function AppContent() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [theme, setTheme] = useTheme();
  const [developerMode, setDeveloperMode] = useDeveloperMode();

  const goToProperties = () => {
    setSelectedPropertyId(null);
    setView("properties");
  };

  return (
    <main>
      <header className="app-header">
        <h1>Portfolio Manager</h1>
        <nav className="main-nav">
          <button
            className={`main-nav__link${view === "dashboard" ? " main-nav__link--active" : ""}`}
            onClick={() => setView("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`main-nav__link${view === "properties" ? " main-nav__link--active" : ""}`}
            onClick={goToProperties}
          >
            Properties
          </button>
          <button
            className={`main-nav__link${view === "strategies" ? " main-nav__link--active" : ""}`}
            onClick={() => setView("strategies")}
          >
            Strategies
          </button>
          <button
            className={`main-nav__link${view === "mortgage-lab" ? " main-nav__link--active" : ""}`}
            onClick={() => setView("mortgage-lab")}
          >
            Mortgage Lab
          </button>
          <button
            className={`main-nav__link${view === "reports" ? " main-nav__link--active" : ""}`}
            onClick={() => setView("reports")}
          >
            Reports
          </button>
        </nav>
        <div className="app-header__controls">
          <button
            className={`developer-mode-toggle${developerMode ? " developer-mode-toggle--active" : ""}`}
            title={developerMode ? "Turn off developer mode" : "Turn on developer mode — shows calculation internals"}
            onClick={() => setDeveloperMode((current) => !current)}
          >
            {"</>"}
          </button>
          <button
            className="theme-toggle"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>
      {view === "dashboard" ? (
        <Dashboard />
      ) : view === "strategies" ? (
        <ScenarioList />
      ) : view === "mortgage-lab" ? (
        <MortgageScenarioList />
      ) : view === "reports" ? (
        <ReportsHome />
      ) : selectedPropertyId ? (
        <PropertyDetail propertyId={selectedPropertyId} onBack={() => setSelectedPropertyId(null)} />
      ) : (
        <PropertyList onSelectProperty={setSelectedPropertyId} />
      )}
    </main>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DeveloperModeProvider>
        <PortfolioProvider>
          <AppContent />
        </PortfolioProvider>
      </DeveloperModeProvider>
    </ThemeProvider>
  );
}

export default App;
