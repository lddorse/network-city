import type { System } from "./System";
import type { Router } from "../entities/Router";
import type { NetworkInterface } from "../entities/NetworkInterface";
import type { IPv4Address } from "../network/IPv4Address";
import { Route } from "../network/Route.ts";

type AddressedInterface = NetworkInterface & { ipv4: IPv4Address };

function isRoutable(iface: NetworkInterface): iface is AddressedInterface {
  return iface.ipv4 !== null && iface.administrativeStatus === "up" && iface.operationalStatus === "up";
}

// Connected routes precede Local routes as two flat groups, not
// interleaved per interface — real IOS interleaves by address order, but
// this milestone deliberately has no sorting beyond "Connected, then Local."
function deriveRoutes(interfaces: NetworkInterface[]): Route[] {
  const routable = interfaces.filter(isRoutable);

  const connected = routable.map(
    (iface) => new Route(iface.ipv4.networkAddress(), iface.ipv4.prefixLength, "Connected", iface.id)
  );

  const local = routable.map((iface) => new Route(iface.ipv4.address, 32, "Local", iface.id));

  return [...connected, ...local];
}

// Rebuilds every router's RoutingTable from its own interfaces' current
// IPv4/operational state. Always a full rebuild rather than an incremental
// diff — a removed interface or address simply isn't in the next result,
// so there's nothing to clean up and nothing to duplicate.
export class RoutingTableSystem implements System {
  private routers: Router[];

  constructor(routers: Router[]) {
    this.routers = routers;
  }

  update(_delta: number): void {
    this.rebuild();
  }

  rebuild(): void {
    for (const router of this.routers) {
      router.routingTable.routes = deriveRoutes(router.interfaces);
    }
  }
}
