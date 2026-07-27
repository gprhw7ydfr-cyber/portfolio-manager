import type { MortgageEvent } from "./events/MortgageEvent";
import type { RecurringPayment } from "./RecurringPayment";
import type { FixedRateSettings, RateType } from "./FixedRateSettings";
import type { MortgageProductType, OffsetSettings, RevolvingCreditSettings } from "./MortgageProduct";
import type { RefixBalanceTarget } from "./RefixBalanceTarget";

export interface MortgageSplit {
  id: string;

  name: string;

  principal: number;

  annualInterestRate: number;

  years: number;

  events?: MortgageEvent[];

  recurringPayments?: RecurringPayment[];

  rateType?: RateType;

  fixedRateSettings?: FixedRateSettings;

  productType?: MortgageProductType;
  offsetSettings?: OffsetSettings;
  revolvingCreditSettings?: RevolvingCreditSettings;

  /** Opts this split into balance redistribution whenever any split in the mortgage refixes. */
  refixBalanceTarget?: RefixBalanceTarget;
}
