import { useState } from "react";
import { PortfolioProvider } from "./store/PortfolioContext";
import { PropertyList } from "./components/property/PropertyList";
import { PropertyDetail } from "./components/property/PropertyDetail";

function AppContent() {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  return (
    <main>
      <header className="app-header">
        <h1>Portfolio Manager</h1>
        <span>New Zealand mortgage planner</span>
      </header>
      {selectedPropertyId ? (
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
