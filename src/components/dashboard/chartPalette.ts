import type { AssetType } from "../../domain/asset/Asset";

/** Validated categorical palette (dataviz skill reference instance) — fixed order, never cycled,
 *  so a category keeps its color regardless of which other categories are present. */
export const CATEGORICAL = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: "#4a3aa7",
  red: "#e34948",
} as const;

export const SEQUENTIAL_BLUE = "#2a78d6";

/** Fixed so a category never repaints when the set of present asset types changes.
 *  Shares/ETF/managed-fund have no concrete Asset type yet — folded onto "red" until they do. */
export const ASSET_TYPE_COLOR: Record<AssetType, string> = {
  "residential-property": CATEGORICAL.blue,
  "commercial-property": CATEGORICAL.orange,
  "vacant-land": CATEGORICAL.aqua,
  everyday: CATEGORICAL.yellow,
  savings: CATEGORICAL.magenta,
  "term-deposit": CATEGORICAL.green,
  other: CATEGORICAL.violet,
  shares: CATEGORICAL.red,
  etf: CATEGORICAL.red,
  "managed-fund": CATEGORICAL.red,
};

export const CHART_INK = {
  primary: "#172b25",
  secondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  surface: "#ffffff",
};
