import type { System } from "./System";
import { EventEmitter } from "../events/EventEmitter";
import type { Vehicle } from "../entities/Vehicle";
import { movementDistance, positionAlongMovement } from "../movement/Movement";

export interface ArrivalEvent {
  vehicleId: string;
}

// Advances every vehicle's movement by delta seconds and reports arrivals.
// Reusable across any future kind of mover: it only depends on the
// Vehicle/Movement shapes, never on what the vehicle is carrying.
export class MovementSystem implements System {
  readonly onArrival: EventEmitter<ArrivalEvent>;
  private vehicles: Vehicle[];

  constructor(vehicles: Vehicle[]) {
    this.vehicles = vehicles;
    this.onArrival = new EventEmitter<ArrivalEvent>();
  }

  update(delta: number): void {
    for (const vehicle of this.vehicles) {
      const { movement } = vehicle;

      if (movement.progress >= 1) {
        continue;
      }

      const distance = movementDistance(movement);
      const step = distance === 0 ? 1 : (movement.speed * delta) / distance;

      movement.progress = Math.min(1, Math.max(0, movement.progress + step));
      vehicle.position = positionAlongMovement(movement);

      if (movement.progress >= 1) {
        this.onArrival.emit({ vehicleId: vehicle.id });
      }
    }
  }
}
