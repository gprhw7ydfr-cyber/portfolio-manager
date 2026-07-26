import type { FocusEventHandler } from "react";

/** A controlled number input at 0 doesn't reliably let the browser overwrite that "0" when
 *  typing the next digit, leaving stray values like "05" — strip a leading zero once a real
 *  digit follows. Pair with selectIfZero so focusing a zero field selects it for full overwrite. */
export function numberFromInput(previousValue: number, nextValue: string): number {
  return Number(previousValue === 0 ? nextValue.replace(/^0+(?=\d)/, "") : nextValue);
}

export function selectIfZero(value: number): FocusEventHandler<HTMLInputElement> {
  return (event) => {
    if (value === 0) event.currentTarget.select();
  };
}
