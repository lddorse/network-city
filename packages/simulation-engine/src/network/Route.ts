export type RouteType = "Connected" | "Local";

// A single derived routing table entry. Plain, immutable data — no
// lookup, next-hop, or forwarding logic lives here.
export class Route {
  readonly destination: string;
  readonly prefixLength: number;
  readonly type: RouteType;
  readonly outgoingInterfaceId: string;

  constructor(destination: string, prefixLength: number, type: RouteType, outgoingInterfaceId: string) {
    this.destination = destination;
    this.prefixLength = prefixLength;
    this.type = type;
    this.outgoingInterfaceId = outgoingInterfaceId;
  }
}
