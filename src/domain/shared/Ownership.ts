/** A stake in an asset or liability. Stakes for a given asset/liability should sum to 100. */
export interface OwnershipStake {
  entityId: string;
  percentage: number;
}
