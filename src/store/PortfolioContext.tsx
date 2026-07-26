import { useEffect, useState, type ReactNode } from "react";
import { createDefaultPortfolio } from "../domain/portfolio/createDefaultPortfolio";
import { loadPortfolio, savePortfolio } from "../services/PortfolioStorage";
import { PortfolioContext } from "./PortfolioReactContext";
import type { Portfolio } from "../domain/portfolio/Portfolio";

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolio, setPortfolio] = useState<Portfolio>(() => loadPortfolio() ?? createDefaultPortfolio());

  useEffect(() => {
    savePortfolio(portfolio);
  }, [portfolio]);

  return (
    <PortfolioContext.Provider value={[portfolio, setPortfolio]}>
      {children}
    </PortfolioContext.Provider>
  );
}
