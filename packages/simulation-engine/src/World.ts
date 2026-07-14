import { Building } from "./entities/Building";
import { Router } from "./entities/Router";
import { Vehicle } from "./entities/Vehicle";
import { Link } from "./entities/Link";
import { createMovement } from "./movement/Movement";
import { MovementSystem } from "./systems/MovementSystem";

const DELIVERY_VEHICLE_SPEED = 120; // world units per second

export class World {
  buildings: Building[];
  routers: Router[];
  links: Link[];
  vehicles: Vehicle[];
  movementSystem: MovementSystem;

  constructor() {
    this.buildings = [
      new Building("house", "House", 90, 120, 150, 100),
      new Building("hospital", "Hospital", 720, 420, 160, 110),
    ];

    this.routers = [
      new Router("r1", "R1", 350, 320),
      new Router("r2", "R2", 610, 320),
    ];

    const [house, hospital] = this.buildings;
    const [r1, r2] = this.routers;

    // House -> R1 -> R2 -> Hospital
    this.links = [
      new Link("house-r1", house, r1),
      new Link("r1-r2", r1, r2),
      new Link("r2-hospital", r2, hospital),
    ];

    this.vehicles = [
      new Vehicle("delivery-1", createMovement(this.links, DELIVERY_VEHICLE_SPEED)),
    ];

    this.movementSystem = new MovementSystem(this.vehicles);
  }

  update(delta: number): void {
    this.movementSystem.update(delta);
  }
}
