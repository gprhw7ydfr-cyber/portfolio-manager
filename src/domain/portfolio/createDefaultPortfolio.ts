import type { Portfolio } from "./Portfolio";
import { createDefaultSplit } from "../mortgage/createDefaultSplit";

export function createDefaultPortfolio(): Portfolio {
  const ownerId = crypto.randomUUID();

  return {
    id: crypto.randomUUID(),
    name: "My Portfolio",
    entities: [
      { id: ownerId, name: "You", type: "individual" },
    ],
    assets: [],
    cashFlowItems: [],
    liabilities: [
      {
        id: crypto.randomUUID(),
        type: "mortgage",
        name: "Main Mortgage",
        ownership: [{ entityId: ownerId, percentage: 100 }],
        frequency: "monthly",
        startDate: "2026-07-25",
        splits: [createDefaultSplit("Main Mortgage", { principal: 500000 })],
      },
    ],
  };
}
