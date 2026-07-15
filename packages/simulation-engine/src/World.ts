import { Building } from "./entities/Building.ts";
import { Router } from "./entities/Router.ts";
import { Vehicle } from "./entities/Vehicle.ts";
import { Link } from "./entities/Link.ts";
import { NetworkInterface } from "./entities/NetworkInterface.ts";
import { createMovement } from "./movement/Movement.ts";
import { MovementSystem } from "./systems/MovementSystem.ts";
import { InterfaceStatusSystem } from "./systems/InterfaceStatusSystem.ts";
import { DeliverySystem } from "./systems/DeliverySystem.ts";

const DELIVERY_VEHICLE_SPEED = 120; // world units per second

export class World {
  buildings: Building[];
  routers: Router[];
  links: Link[];
  vehicles: Vehicle[];
  movementSystem: MovementSystem;
  deliverySystem: DeliverySystem;
  interfaceStatusSystem: InterfaceStatusSystem;

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

    const houseEth0 = new NetworkInterface("house-eth0", "eth0", house);
    house.interfaces.push(houseEth0);

    const hospitalEth0 = new NetworkInterface("hospital-eth0", "eth0", hospital);
    hospital.interfaces.push(hospitalEth0);

    const r1Gi00 = new NetworkInterface("r1-gi0/0", "Gi0/0", r1);
    const r1Gi01 = new NetworkInterface("r1-gi0/1", "Gi0/1", r1);
    r1.interfaces.push(r1Gi00, r1Gi01);

    const r2Gi00 = new NetworkInterface("r2-gi0/0", "Gi0/0", r2);
    const r2Gi01 = new NetworkInterface("r2-gi0/1", "Gi0/1", r2);
    r2.interfaces.push(r2Gi00, r2Gi01);

    // House.eth0 -> R1.Gi0/0 -> R1.Gi0/1 -> R2.Gi0/0 -> R2.Gi0/1 -> Hospital.eth0
    this.links = [
      new Link("house-r1", houseEth0, r1Gi00),
      new Link("r1-r2", r1Gi01, r2Gi00),
      new Link("r2-hospital", r2Gi01, hospitalEth0),
    ];

    this.vehicles = [
      new Vehicle("delivery-1", createMovement(this.links, DELIVERY_VEHICLE_SPEED)),
    ];

    this.movementSystem = new MovementSystem(this.vehicles);
    this.deliverySystem = new DeliverySystem(this.vehicles, this.movementSystem);
    this.interfaceStatusSystem = new InterfaceStatusSystem([...this.buildings, ...this.routers], this.links);
    // Resolve derived status once up front so it's correct before the first tick.
    this.interfaceStatusSystem.recompute();
  }

  update(delta: number): void {
    this.interfaceStatusSystem.update(delta);
    this.deliverySystem.update(delta);
  }
}
