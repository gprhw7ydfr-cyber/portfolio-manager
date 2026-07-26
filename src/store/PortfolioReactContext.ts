import { createContext, type Dispatch, type SetStateAction } from "react";
import type { Portfolio } from "../domain/portfolio/Portfolio";

export type PortfolioContextValue = [Portfolio, Dispatch<SetStateAction<Portfolio>>];

export const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined);
