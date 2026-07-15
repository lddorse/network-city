import { Building, Router } from "@network-city/simulation-engine";
import type { Link, NetworkInterface, Node } from "@network-city/simulation-engine";

// Nodes only share id/position; getting a human label requires narrowing
// to read its type-specific name (Building.name, Router.hostname).
export function deviceName(node: Node): string {
  if (node instanceof Building) {
    return node.name;
  }

  if (node instanceof Router) {
    return node.hostname;
  }

  return node.id;
}

export function describeEndpoint(iface: NetworkInterface): string {
  return `${deviceName(iface.owner)} ${iface.name}`;
}

export function formatIPv4Cidr(iface: NetworkInterface): string {
  return iface.ipv4 ? iface.ipv4.toCidr() : "Unassigned";
}

export interface SubnetDetails {
  network: string;
  broadcast: string;
  mask: string;
}

// undefined (not an "Unassigned" placeholder) so callers can decide whether
// to render the block at all — an unconfigured interface has no subnet.
export function subnetDetails(iface: NetworkInterface): SubnetDetails | undefined {
  if (!iface.ipv4) {
    return undefined;
  }

  return {
    network: iface.ipv4.networkAddress(),
    broadcast: iface.ipv4.broadcastAddress(),
    mask: iface.ipv4.subnetMask(),
  };
}

// Informational only — this milestone derives and displays subnet
// compatibility but does not use it to affect delivery or link behavior.
// hasMatchingSubnetConfiguration is a config consistency check (matching
// prefix length + network address), not real on-link determination.
export function subnetCompatibility(link: Link): string {
  const { endpointA, endpointB } = link;

  if (!endpointA.ipv4 || !endpointB.ipv4) {
    return "Unassigned";
  }

  return endpointA.ipv4.hasMatchingSubnetConfiguration(endpointB.ipv4) ? "Same subnet" : "Different subnet";
}
