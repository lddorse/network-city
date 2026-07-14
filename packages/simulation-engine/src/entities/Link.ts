import type { Node } from "./Node";

export type LinkStatus = "up" | "down";

// An explicit connection between two Nodes. Carries no position of its own;
// its endpoints are resolved from `from`/`to` as needed.
export class Link {
  id: string;
  from: Node;
  to: Node;
  status: LinkStatus;
  cost: number;

  constructor(id: string, from: Node, to: Node, status: LinkStatus = "up", cost: number = 1) {
    this.id = id;
    this.from = from;
    this.to = to;
    this.status = status;
    this.cost = cost;
  }
}
