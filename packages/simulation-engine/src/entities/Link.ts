import type { NetworkInterface } from "./NetworkInterface";

export type LinkStatus = "up" | "down";

// An explicit connection between two interfaces (not nodes directly).
// Carries no position of its own; a drawable point is reached via
// endpointA.owner.connectionPoint / endpointB.owner.connectionPoint.
export class Link {
  id: string;
  endpointA: NetworkInterface;
  endpointB: NetworkInterface;
  status: LinkStatus;
  cost: number;

  constructor(
    id: string,
    endpointA: NetworkInterface,
    endpointB: NetworkInterface,
    status: LinkStatus = "up",
    cost: number = 1
  ) {
    this.id = id;
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.status = status;
    this.cost = cost;
  }
}
