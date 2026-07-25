export class Money {
  private readonly cents: number;

  private constructor(cents: number) {
    this.cents = Math.round(cents);
  }

  static fromDollars(amount: number): Money {
    return new Money(amount * 100);
  }

  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  toDollars(): number {
    return this.cents / 100;
  }

  getCents(): number {
    return this.cents;
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return Money.fromCents(this.cents - other.cents);
  }

  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.cents * factor));
  }

  divide(divisor: number): Money {
    return Money.fromCents(Math.round(this.cents / divisor));
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  greaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  lessThan(other: Money): boolean {
    return this.cents < other.cents;
  }

  format(
    locale = "en-NZ",
    currency = "NZD",
  ): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(this.toDollars());
  }
}