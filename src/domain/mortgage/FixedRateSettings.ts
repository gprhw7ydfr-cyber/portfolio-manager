export type RateType = "floating" | "fixed";

export interface FixedRateSettings {
  fixedRateTermMonths: number;
  refixAnnualRate: number;
  refixTermMonths: number;
}
