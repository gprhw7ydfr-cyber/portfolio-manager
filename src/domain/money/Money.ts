export class Money {
  private readonly cents: number;
  private readonly currency: string;

  private constructor(cents: number, currency: string = "NZD") {
    this.cents = Math.round(cents);
    this.currency = currency;
  }

  static fromDollars(amount: number, currency = "NZD"): Money {
    return new Money(amount * 100, currency);
  }

  static fromCents(cents: number, currency = "NZD"): Money {
    return new Money(cents, currency);
  }

  toDollars(): number {
    return this.cents / 100;
  }

  getCents(): number {
    return this.cents;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.cents + other.cents, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromCents(this.cents - other.cents, this.currency);
  }

  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.cents * factor), this.currency);
  }

  divide(divisor: number): Money {
    return Money.fromCents(Math.round(this.cents / divisor), this.currency);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents > other.cents;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.cents < other.cents;
  }

  format(locale = "en-NZ", currency: string = this.currency): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(this.toDollars());
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot combine ${this.currency} with ${other.currency}`);
    }
  }
}
