import type { System } from "./System";
import { EventEmitter } from "../events/EventEmitter.ts";
import type { Vehicle } from "../entities/Vehicle";
import type { Link } from "../entities/Link";
import type { MovementSystem } from "./MovementSystem";
import { isMovementComplete, movementDistance } from "../movement/Movement.ts";

export interface DeliveryBlockedEvent {
  vehicleId: string;
  blockedLinkId: string;
  currentNodeId: string;
}

// link.status models a direct physical failure; each endpoint's
// operationalStatus (derived by InterfaceStatusSystem from administrativeStatus
// and link.status) additionally covers an interface shut down at either end.
// Checking both means an administratively-down interface blocks traversal
// even in the same tick InterfaceStatusSystem last ran, without this system
// needing to know why an endpoint is down.
function canTraverseLink(link: Link): boolean {
  return (
    link.status === "up" &&
    link.endpointA.operationalStatus === "up" &&
    link.endpointB.operationalStatus === "up"
  );
}

// The traversal/path layer referenced by the Link Failure milestone: it
// decides whether a vehicle may enter the link ahead of it, and drives
// MovementSystem one segment boundary at a time so a large delta can never
// carry a vehicle past a down link within a single tick. MovementSystem
// itself stays pure kinematics and never looks at link status.
export class DeliverySystem implements System {
  readonly onBlocked: EventEmitter<DeliveryBlockedEvent>;
  private vehicles: Vehicle[];
  private movementSystem: MovementSystem;
  private blockedVehicleIds: Set<string>;

  constructor(vehicles: Vehicle[], movementSystem: MovementSystem) {
    this.vehicles = vehicles;
    this.movementSystem = movementSystem;
    this.onBlocked = new EventEmitter<DeliveryBlockedEvent>();
    this.blockedVehicleIds = new Set();
  }

  update(delta: number): void {
    for (const vehicle of this.vehicles) {
      this.advance(vehicle, delta);
    }
  }

  private advance(vehicle: Vehicle, delta: number): void {
    const { movement } = vehicle;
    let remainingDelta = delta;

    // Re-checks the gate every time a segment boundary is crossed, so a
    // single large delta can still cover several up links but never enters
    // a down one.
    while (remainingDelta > 0 && !isMovementComplete(movement)) {
      if (!canTraverseLink(movement.link)) {
        this.markBlocked(vehicle, movement.link);
        return;
      }

      this.blockedVehicleIds.delete(vehicle.id);

      const distance = movementDistance(movement);
      const remainingProgress = 1 - movement.progress;
      const timeToBoundary = movement.speed > 0 ? (remainingProgress * distance) / movement.speed : 0;
      const step = Math.min(remainingDelta, Math.max(timeToBoundary, 0));

      this.movementSystem.advance(vehicle, step);
      remainingDelta -= step;
    }
  }

  private markBlocked(vehicle: Vehicle, link: Link): void {
    if (this.blockedVehicleIds.has(vehicle.id)) {
      return;
    }

    this.blockedVehicleIds.add(vehicle.id);
    this.onBlocked.emit({
      vehicleId: vehicle.id,
      blockedLinkId: link.id,
      currentNodeId: link.endpointA.owner.id,
    });
  }
}
