import type { Portfolio } from "../domain/portfolio/Portfolio";

const STORAGE_KEY = "portfolio-manager:portfolio";
const SCHEMA_VERSION = 1;

interface StoredPortfolio {
  schemaVersion: number;
  portfolio: Portfolio;
}

/** The only two functions in the app that know about localStorage — swapping to a different
 *  storage backend (e.g. SQLite) later means reimplementing these, not touching callers. */
export function loadPortfolio(): Portfolio | undefined {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return undefined;

  try {
    const stored = JSON.parse(raw) as StoredPortfolio;
    if (stored.schemaVersion !== SCHEMA_VERSION) return undefined;
    return {
      ...stored.portfolio,
      scenarios: stored.portfolio.scenarios ?? [],
      mortgageScenarios: stored.portfolio.mortgageScenarios ?? [],
      mortgageStrategies: stored.portfolio.mortgageStrategies ?? [],
    };
  } catch {
    return undefined;
  }
}

export function savePortfolio(portfolio: Portfolio): void {
  const stored: StoredPortfolio = { schemaVersion: SCHEMA_VERSION, portfolio };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}
