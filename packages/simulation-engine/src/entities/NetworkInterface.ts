import type { Node } from "./Node";
import type { IPv4Address } from "../network/IPv4Address";

export type InterfaceStatus = "up" | "down";

// A network interface owned by a Node (Router or Building for now). Carries
// no position of its own; its visual location comes from owner.connectionPoint.
export class NetworkInterface {
  id: string;
  name: string;
  owner: Node;
  administrativeStatus: InterfaceStatus;
  operationalStatus: InterfaceStatus;
  // null means "no address configured" (as opposed to undefined); every
  // reader in this codebase only needs to check for this one falsy value.
  ipv4: IPv4Address | null;

  constructor(
    id: string,
    name: string,
    owner: Node,
    administrativeStatus: InterfaceStatus = "up",
    operationalStatus: InterfaceStatus = "up",
    ipv4: IPv4Address | null = null
  ) {
    this.id = id;
    this.name = name;
    this.owner = owner;
    this.administrativeStatus = administrativeStatus;
    this.operationalStatus = operationalStatus;
    this.ipv4 = ipv4;
  }
}
