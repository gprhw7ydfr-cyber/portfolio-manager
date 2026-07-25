import { Entity } from "../shared/Entity";
import { Money } from "../money/Money";
import { InterestRate } from "./InterestRate";

export class LoanSplit extends Entity {

  constructor(
    id: string,

    public name: string,

    public principal: Money,

    public interestRate: InterestRate,

    public termYears: number
  ) {
    super(id);
  }

}