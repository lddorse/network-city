import { Building } from "./entities/Building";
import { Router } from "./entities/Router";
import { Vehicle } from "./entities/Vehicle";
import { createMovement } from "./movement/Movement";
import { MovementSystem } from "./systems/MovementSystem";

export interface RouterLink {
  routerAId: string;
  routerBId: string;
}

const DELIVERY_VEHICLE_SPEED = 120; // world units per second

export class World {
  buildings: Building[];
  routers: Router[];
  links: RouterLink[];
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

    this.links = [{ routerAId: "r1", routerBId: "r2" }];

    const [house, hospital] = this.buildings;
    this.vehicles = [
      new Vehicle(
        "delivery-1",
        createMovement(house.center, hospital.center, DELIVERY_VEHICLE_SPEED)
      ),
    ];

    this.movementSystem = new MovementSystem(this.vehicles);
  }

  update(delta: number): void {
    this.movementSystem.update(delta);
  }
}
