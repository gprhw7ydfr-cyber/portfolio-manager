export class InterestRate {
  private readonly annualRate: number;

  constructor(annualRate: number) {
    if (annualRate < 0) {
      throw new Error("Interest rate cannot be negative.");
    }

    this.annualRate = annualRate;
  }

  annualPercentage(): number {
    return this.annualRate;
  }

  annualDecimal(): number {
    return this.annualRate / 100;
  }

  monthlyDecimal(): number {
    return this.annualDecimal() / 12;
  }

  dailyDecimal(daysPerYear = 365): number {
    return this.annualDecimal() / daysPerYear;
  }

  equals(other: InterestRate): boolean {
    return this.annualRate === other.annualRate;
  }

  toString(): string {
    return `${this.annualRate.toFixed(2)}%`;
  }
}