import { useState } from "react";
import { PortfolioProvider } from "./store/PortfolioContext";
import { Dashboard } from "./components/dashboard/Dashboard";
import { PropertyList } from "./components/property/PropertyList";
import { PropertyDetail } from "./components/property/PropertyDetail";

type View = "dashboard" | "properties";

function AppContent() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const goToProperties = () => {
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
        </nav>
      </header>
      {view === "dashboard" ? (
        <Dashboard />
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
    <PortfolioProvider>
      <AppContent />
    </PortfolioProvider>
  );
}

export default App;
