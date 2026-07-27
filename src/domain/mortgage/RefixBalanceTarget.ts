export type RefixBalanceTargetMode = "value" | "percentage" | "remainder";

/** How much of the mortgage's balance this split should hold whenever any split in the
 *  mortgage refixes. Only splits that opt in with one of these are ever moved. */
export interface RefixBalanceTarget {
  mode: RefixBalanceTargetMode;
  /** Dollars, for "value" mode. */
  amount?: number;
  /** 0-100, for "percentage" mode — of the total balance across participating splits. */
  percentage?: number;
  /** Relative weight, for "remainder" mode — normalised among all remainder-mode participants. */
  share?: number;
}
