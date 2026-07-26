import type { MortgageEvent } from "./MortgageEvent";
import type { MortgageSimulationState } from "../MortgageSimulationState";

export class RateChangeEvent implements MortgageEvent {
  constructor(
    private paymentNumber: number,
    private newAnnualRate: number
  ) {}

  applies(paymentNumber: number): boolean {
    return paymentNumber === this.paymentNumber;
  }

  execute(state: MortgageSimulationState): void {
    state.annualRate = this.newAnnualRate;
  }
}