import type { MortgageSimulationState } from "../MortgageSimulationState";

export interface MortgageEvent {
  applies(paymentNumber: number): boolean;

  execute(state: MortgageSimulationState): void;
}