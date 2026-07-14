import { Building } from "./entities/Building";
import { Router } from "./entities/Router";

export class World {
  buildings = [
    new Building("house", "House", 160, 170),
    new Building("hospital", "Hospital", 800, 470),
  ];

  routers = [
    new Router("r1", "R1", 350, 320),
    new Router("r2", "R2", 610, 320),
  ];

  update(_delta: number): void {
    // Simulation tick
  }
}
