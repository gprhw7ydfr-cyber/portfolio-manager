import type { MortgageSimulationState } from "../MortgageSimulationState";
import type { MortgageEvent } from "./MortgageEvent";

/** Internal portfolio transfer. A matching opposite adjustment is applied to another split. */
export class BalanceAdjustmentEvent implements MortgageEvent {
  constructor(
    private paymentNumber: number,
    private adjustment: number,
  ) {}

  applies(paymentNumber: number): boolean {
    return paymentNumber === this.paymentNumber;
  }

  execute(state: MortgageSimulationState): void {
    state.balance = Math.max(state.balance + this.adjustment, 0);
  }
}
