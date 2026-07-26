import { useContext } from "react";
import { PortfolioContext, type PortfolioContextValue } from "./PortfolioReactContext";

export function usePortfolio(): PortfolioContextValue {
  const value = useContext(PortfolioContext);
  if (!value) throw new Error("usePortfolio must be used within a PortfolioProvider");
  return value;
}
