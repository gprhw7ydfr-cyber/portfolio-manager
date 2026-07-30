import type { Portfolio } from "./Portfolio";

export function createDefaultPortfolio(): Portfolio {
  const ownerId = crypto.randomUUID();

  return {
    id: crypto.randomUUID(),
    name: "My Portfolio",
    entities: [
      { id: ownerId, name: "You", type: "individual" },
    ],
    assets: [],
    liabilities: [],
    scenarios: [],
    mortgageScenarios: [],
  };
}
