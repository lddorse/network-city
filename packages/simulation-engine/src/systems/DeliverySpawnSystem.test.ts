import { test } from "node:test";
import assert from "node:assert/strict";
import { Router } from "../entities/Router.ts";
import { NetworkInterface } from "../entities/NetworkInterface.ts";
import { Link } from "../entities/Link.ts";
import type { Vehicle } from "../entities/Vehicle.ts";
import { DeliverySpawnSystem } from "./DeliverySpawnSystem.ts";

const SPEED = 100; // world units per second
const INTERVAL = 5; // seconds

// A -- link -> B, a single link is all DeliverySpawnSystem needs: it never
// advances a vehicle along its path, only creates one.
function buildLinks(): Link[] {
  const a = new Router("a", "A", 0, 0);
  const b = new Router("b", "B", 100, 0);

  const aOut = new NetworkInterface("a-out", "eth0", a);
  const bIn = new NetworkInterface("b-in", "eth0", b);

  a.interfaces.push(aOut);
  b.interfaces.push(bIn);

  return [new Link("link-ab", aOut, bIn)];
}

function ids(vehicles: Vehicle[]): string[] {
  return vehicles.map((vehicle) => vehicle.id);
}

test("no delivery spawns before the world is ever ticked", () => {
  const vehicles: Vehicle[] = [];
  new DeliverySpawnSystem(vehicles, buildLinks(), SPEED, INTERVAL);

  assert.equal(vehicles.length, 0);
});

test("a delivery spawns immediately on the first update", () => {
  const vehicles: Vehicle[] = [];
  const spawner = new DeliverySpawnSystem(vehicles, buildLinks(), SPEED, INTERVAL);

  spawner.update(0.001);

  assert.deepEqual(ids(vehicles), ["delivery-1"]);
});

test("a new delivery spawns after the configured interval elapses", () => {
  const vehicles: Vehicle[] = [];
  const spawner = new DeliverySpawnSystem(vehicles, buildLinks(), SPEED, INTERVAL);

  spawner.update(0.001);
  assert.deepEqual(ids(vehicles), ["delivery-1"]);

  spawner.update(INTERVAL - 1);
  assert.deepEqual(ids(vehicles), ["delivery-1"]);

  spawner.update(1);
  assert.deepEqual(ids(vehicles), ["delivery-1", "delivery-2"]);
});

test("spawned deliveries have unique, sequential ids", () => {
  const vehicles: Vehicle[] = [];
  const spawner = new DeliverySpawnSystem(vehicles, buildLinks(), SPEED, INTERVAL);

  spawner.update(INTERVAL * 3.5);

  assert.deepEqual(ids(vehicles), ["delivery-1", "delivery-2", "delivery-3", "delivery-4"]);
  assert.equal(new Set(ids(vehicles)).size, vehicles.length);
});

test("a single large delta spawns every delivery that interval covers", () => {
  const vehicles: Vehicle[] = [];
  const spawner = new DeliverySpawnSystem(vehicles, buildLinks(), SPEED, INTERVAL);

  spawner.update(INTERVAL * 1.5);

  assert.deepEqual(ids(vehicles), ["delivery-1", "delivery-2"]);
});
