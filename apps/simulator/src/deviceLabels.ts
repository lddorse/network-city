import { Building, Router } from "@network-city/simulation-engine";
import type { NetworkInterface, Node } from "@network-city/simulation-engine";

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
