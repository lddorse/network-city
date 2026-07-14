import type { Node } from "./Node";

export type InterfaceStatus = "up" | "down";

// A network interface owned by a Node (Router or Building for now). Carries
// no position of its own; its visual location comes from owner.connectionPoint.
export class NetworkInterface {
  id: string;
  name: string;
  owner: Node;
  administrativeStatus: InterfaceStatus;
  operationalStatus: InterfaceStatus;

  constructor(
    id: string,
    name: string,
    owner: Node,
    administrativeStatus: InterfaceStatus = "up",
    operationalStatus: InterfaceStatus = "up"
  ) {
    this.id = id;
    this.name = name;
    this.owner = owner;
    this.administrativeStatus = administrativeStatus;
    this.operationalStatus = operationalStatus;
  }
}
