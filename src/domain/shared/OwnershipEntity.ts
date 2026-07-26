export type OwnershipEntityType =
  | "individual"
  | "joint"
  | "trust"
  | "company"
  | "ltc"
  | "partnership";

export interface OwnershipEntity {
  id: string;
  name: string;
  type: OwnershipEntityType;
}
