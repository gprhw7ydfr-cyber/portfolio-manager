import { Entity } from "../shared/Entity";
import { LoanSplit } from "./LoanSplit";

export class Mortgage extends Entity {

  constructor(
    id: string,

    public name: string,

    public lender: string,

    public loanSplits: LoanSplit[] = []
  ) {
    super(id);
  }

  addSplit(split: LoanSplit) {
    this.loanSplits.push(split);
  }

}