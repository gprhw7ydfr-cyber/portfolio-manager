export function formatMoney(value: number): string {
  return value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
}

/** Auto-compact for axis labels and tight spaces: 1,284 / 12.9K / $4.2M. */
export function formatCompactMoney(value: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
