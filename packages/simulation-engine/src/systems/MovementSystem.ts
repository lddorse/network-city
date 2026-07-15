import type { System } from "./System";
import { EventEmitter } from "../events/EventEmitter.ts";
import type { Vehicle } from "../entities/Vehicle";
import {
  isMovementComplete,
  movementDistance,
  positionAlongMovement,
} from "../movement/Movement.ts";

export interface ArrivalEvent {
  vehicleId: string;
}

// Advances every vehicle along its movement path by delta seconds and
// reports arrivals. Reusable across any future kind of mover: it only
// depends on the Vehicle/Movement shapes, never on what the vehicle is
// carrying or how many waypoints its path has.
export class MovementSystem implements System {
  readonly onArrival: EventEmitter<ArrivalEvent>;
  private vehicles: Vehicle[];

  constructor(vehicles: Vehicle[]) {
    this.vehicles = vehicles;
    this.onArrival = new EventEmitter<ArrivalEvent>();
  }

  update(delta: number): void {
    for (const vehicle of this.vehicles) {
      this.advance(vehicle, delta);
    }
  }

  // Public so a traversal/gating layer (e.g. DeliverySystem) can advance one
  // vehicle at a time with a delta it has already clamped to a segment
  // boundary, instead of this system deciding whether a link may be
  // entered. This method itself remains pure kinematics: it has no opinion
  // on link status.
  advance(vehicle: Vehicle, delta: number): void {
    const { movement } = vehicle;

    if (isMovementComplete(movement)) {
      return;
    }

    // A single large delta (e.g. a frame hitch) can cover more than one
    // segment, so consume it segment by segment rather than in one step.
    let remainingDelta = delta;

    while (remainingDelta > 0) {
      const distance = movementDistance(movement);
      const step = distance === 0 ? 1 : Math.max(0, (movement.speed * remainingDelta) / distance);
      const newProgress = movement.progress + step;

      if (newProgress < 1) {
        movement.progress = newProgress;
        break;
      }

      const progressNeeded = 1 - movement.progress;
      const timeConsumed =
        distance === 0 || movement.speed <= 0 ? 0 : (progressNeeded * distance) / movement.speed;

      movement.progress = 1;
      remainingDelta -= timeConsumed;

      if (movement.remainingWaypoints.length === 0) {
        vehicle.position = { ...movement.to };
        this.onArrival.emit({ vehicleId: vehicle.id });
        return;
      }

      const [nextTo, ...restWaypoints] = movement.remainingWaypoints;
      const [nextLink, ...restLinks] = movement.remainingLinks;
      movement.from = movement.to;
      movement.to = nextTo;
      movement.link = nextLink;
      movement.remainingWaypoints = restWaypoints;
      movement.remainingLinks = restLinks;
      movement.progress = 0;
    }

    vehicle.position = positionAlongMovement(movement);
  }
}
