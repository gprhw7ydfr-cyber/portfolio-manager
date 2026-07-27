import type { AssetType } from "../../domain/asset/Asset";
import type { Theme } from "../../store/ThemeReactContext";

/** Validated categorical palette (dataviz skill reference instance) — fixed order, never cycled,
 *  so a category keeps its color regardless of which other categories are present.
 *  Dark column is the same eight hues re-stepped for the dark surface, validated against it
 *  (see the dataviz skill's reference palette) — not a separate palette. */
const CATEGORICAL_LIGHT = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: "#4a3aa7",
  red: "#e34948",
} as const;

const CATEGORICAL_DARK = {
  blue: "#3987e5",
  orange: "#d95926",
  aqua: "#199e70",
  yellow: "#c98500",
  magenta: "#d55181",
  green: "#008300",
  violet: "#9085e9",
  red: "#e66767",
} as const;

export type CategoricalKey = keyof typeof CATEGORICAL_LIGHT;

export function getCategorical(theme: Theme): Record<CategoricalKey, string> {
  return theme === "dark" ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;
}

export function getSequentialBlue(theme: Theme): string {
  return theme === "dark" ? "#3987e5" : "#2a78d6";
}

/** Fixed so a category never repaints when the set of present asset types changes.
 *  Shares/ETF/managed-fund have no concrete Asset type yet — folded onto "red" until they do. */
function assetTypeColor(categorical: Record<CategoricalKey, string>): Record<AssetType, string> {
  return {
    "residential-property": categorical.blue,
    "commercial-property": categorical.orange,
    "vacant-land": categorical.aqua,
    everyday: categorical.yellow,
    savings: categorical.magenta,
    "term-deposit": categorical.green,
    other: categorical.violet,
    shares: categorical.red,
    etf: categorical.red,
    "managed-fund": categorical.red,
  };
}

export function getAssetTypeColor(theme: Theme): Record<AssetType, string> {
  return assetTypeColor(getCategorical(theme));
}

const CHART_INK_LIGHT = {
  primary: "#172b25",
  secondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  surface: "#ffffff",
};

const CHART_INK_DARK = {
  primary: "#eef3f0",
  secondary: "#c3d1cb",
  muted: "#93a49b",
  gridline: "#24352d",
  baseline: "#3a5a4d",
  surface: "#1a2b24",
};

export function getChartInk(theme: Theme) {
  return theme === "dark" ? CHART_INK_DARK : CHART_INK_LIGHT;
}
