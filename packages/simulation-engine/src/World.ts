import { Building } from "./entities/Building.ts";
import { Router } from "./entities/Router.ts";
import { Vehicle } from "./entities/Vehicle.ts";
import { Link } from "./entities/Link.ts";
import { NetworkInterface } from "./entities/NetworkInterface.ts";
import { MovementSystem } from "./systems/MovementSystem.ts";
import { InterfaceStatusSystem } from "./systems/InterfaceStatusSystem.ts";
import { DeliverySystem } from "./systems/DeliverySystem.ts";
import { DeliverySpawnSystem } from "./systems/DeliverySpawnSystem.ts";
import { RoutingTableSystem } from "./systems/RoutingTableSystem.ts";
import { IPv4Address } from "./network/IPv4Address.ts";

const DELIVERY_VEHICLE_SPEED = 120; // world units per second
const DELIVERY_SPAWN_INTERVAL_SECONDS = 5;

export class World {
  buildings: Building[];
  routers: Router[];
  links: Link[];
  vehicles: Vehicle[];
  movementSystem: MovementSystem;
  deliverySystem: DeliverySystem;
  deliverySpawnSystem: DeliverySpawnSystem;
  interfaceStatusSystem: InterfaceStatusSystem;
  routingTableSystem: RoutingTableSystem;
  private arrivedVehicleIds: Set<string>;

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
    houseEth0.ipv4 = new IPv4Address("192.168.1.10", 24);
    house.interfaces.push(houseEth0);

    const hospitalEth0 = new NetworkInterface("hospital-eth0", "eth0", hospital);
    hospitalEth0.ipv4 = new IPv4Address("192.168.2.10", 24);
    hospital.interfaces.push(hospitalEth0);

    const r1Gi00 = new NetworkInterface("r1-gi0/0", "Gi0/0", r1);
    r1Gi00.ipv4 = new IPv4Address("192.168.1.1", 24);
    const r1Gi01 = new NetworkInterface("r1-gi0/1", "Gi0/1", r1);
    r1Gi01.ipv4 = new IPv4Address("10.0.0.1", 30);
    r1.interfaces.push(r1Gi00, r1Gi01);

    const r2Gi00 = new NetworkInterface("r2-gi0/0", "Gi0/0", r2);
    r2Gi00.ipv4 = new IPv4Address("10.0.0.2", 30);
    const r2Gi01 = new NetworkInterface("r2-gi0/1", "Gi0/1", r2);
    r2Gi01.ipv4 = new IPv4Address("192.168.2.1", 24);
    r2.interfaces.push(r2Gi00, r2Gi01);

    // House.eth0 -> R1.Gi0/0 -> R1.Gi0/1 -> R2.Gi0/0 -> R2.Gi0/1 -> Hospital.eth0
    this.links = [
      new Link("house-r1", houseEth0, r1Gi00),
      new Link("r1-r2", r1Gi01, r2Gi00),
      new Link("r2-hospital", r2Gi01, hospitalEth0),
    ];

    // Populated by deliverySpawnSystem rather than seeded here, so every
    // delivery (including the first) goes through the same spawn path.
    this.vehicles = [];

    this.movementSystem = new MovementSystem(this.vehicles);
    this.deliverySystem = new DeliverySystem(this.vehicles, this.movementSystem);
    this.deliverySpawnSystem = new DeliverySpawnSystem(
      this.vehicles,
      this.links,
      DELIVERY_VEHICLE_SPEED,
      DELIVERY_SPAWN_INTERVAL_SECONDS
    );
    this.interfaceStatusSystem = new InterfaceStatusSystem([...this.buildings, ...this.routers], this.links);
    // Resolve derived status once up front so it's correct before the first tick.
    this.interfaceStatusSystem.recompute();
    this.routingTableSystem = new RoutingTableSystem(this.routers);
    // Routing tables derive from operational status, so build them only
    // after that first recompute above.
    this.routingTableSystem.rebuild();

    // Arrivals are recorded here and only spliced out of the shared
    // `vehicles` array after this tick's systems finish iterating over it
    // (see removeArrivedVehicles), so a vehicle never disappears out from
    // under a for-of loop that's still mid-iteration over the same array.
    this.arrivedVehicleIds = new Set();
    this.movementSystem.onArrival.on(({ vehicleId }) => {
      this.arrivedVehicleIds.add(vehicleId);
    });
  }

  update(delta: number): void {
    this.interfaceStatusSystem.update(delta);
    this.routingTableSystem.update(delta);
    this.deliverySpawnSystem.update(delta);
    this.deliverySystem.update(delta);
    this.removeArrivedVehicles();
  }

  // Keeps `vehicles` from growing without bound as deliveries complete.
  private removeArrivedVehicles(): void {
    if (this.arrivedVehicleIds.size === 0) {
      return;
    }

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      if (this.arrivedVehicleIds.has(this.vehicles[i].id)) {
        this.vehicles.splice(i, 1);
      }
    }

    this.arrivedVehicleIds.clear();
  }
}
