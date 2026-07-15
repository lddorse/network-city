import type { System } from "./System";
import type { Link, LinkStatus } from "../entities/Link";
import type { Node } from "../entities/Node";
import type { InterfaceStatus, NetworkInterface } from "../entities/NetworkInterface";

// Administrative status is authoritative: an interface administratively
// down is always operationally down regardless of link state. Otherwise,
// operational status is only up when the interface has a link and that
// link is up.
export function deriveOperationalStatus(
  administrativeStatus: InterfaceStatus,
  linkStatus: LinkStatus | undefined
): InterfaceStatus {
  if (administrativeStatus === "down") {
    return "down";
  }

  return linkStatus === "up" ? "up" : "down";
}

// Recomputes every interface's operationalStatus from its own
// administrativeStatus and the status of whatever link (if any) it
// terminates. Runs every tick rather than reacting to individual
// mutations, so any future writer of administrativeStatus or link.status
// (CLI, scripted failure, etc.) is picked up without needing to know about
// this system.
export class InterfaceStatusSystem implements System {
  private nodes: Node[];
  private links: Link[];

  constructor(nodes: Node[], links: Link[]) {
    this.nodes = nodes;
    this.links = links;
  }

  update(_delta: number): void {
    this.recompute();
  }

  recompute(): void {
    for (const node of this.nodes) {
      for (const iface of node.interfaces) {
        const link = this.findLink(iface);
        iface.operationalStatus = deriveOperationalStatus(
          iface.administrativeStatus,
          link?.status
        );
      }
    }
  }

  private findLink(iface: NetworkInterface): Link | undefined {
    return this.links.find((link) => link.endpointA === iface || link.endpointB === iface);
  }
}
