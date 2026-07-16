import type { System } from "./System";
import type { Link } from "../entities/Link";
import { Vehicle } from "../entities/Vehicle.ts";
import { createMovement } from "../movement/Movement.ts";

// Spawns a new delivery vehicle along a fixed link chain at a fixed
// interval, so link/interface failure behavior can be exercised repeatedly
// without scripting vehicles by hand. A single large delta can cover more
// than one interval, so spawns are counted out in a loop (mirroring how
// MovementSystem consumes a large delta segment by segment) rather than at
// most once per update, keeping behavior deterministic for a given delta.
export class DeliverySpawnSystem implements System {
  private vehicles: Vehicle[];
  private links: Link[];
  private speed: number;
  private intervalSeconds: number;
  private timeSinceLastSpawn: number;
  private nextDeliveryNumber: number;

  constructor(vehicles: Vehicle[], links: Link[], speed: number, intervalSeconds: number) {
    this.vehicles = vehicles;
    this.links = links;
    this.speed = speed;
    this.intervalSeconds = intervalSeconds;
    // Already "due" so the first delivery spawns immediately rather than
    // after waiting a full interval.
    this.timeSinceLastSpawn = intervalSeconds;
    this.nextDeliveryNumber = 1;
  }

  update(delta: number): void {
    this.timeSinceLastSpawn += delta;

    while (this.timeSinceLastSpawn >= this.intervalSeconds) {
      this.timeSinceLastSpawn -= this.intervalSeconds;
      this.spawn();
    }
  }

  private spawn(): void {
    const id = `delivery-${this.nextDeliveryNumber}`;
    this.nextDeliveryNumber += 1;
    this.vehicles.push(new Vehicle(id, createMovement(this.links, this.speed)));
  }
}
