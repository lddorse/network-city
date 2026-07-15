import { test } from "node:test";
import assert from "node:assert/strict";
import { Router } from "../entities/Router.ts";
import { NetworkInterface } from "../entities/NetworkInterface.ts";
import { Link } from "../entities/Link.ts";
import { Vehicle } from "../entities/Vehicle.ts";
import { createMovement } from "../movement/Movement.ts";
import { MovementSystem } from "./MovementSystem.ts";
import { DeliverySystem } from "./DeliverySystem.ts";

const VEHICLE_SPEED = 100; // world units per second

// A -- link-ab --> B -- link-bc --> C, each segment 100 units long.
function buildChain() {
  const a = new Router("a", "A", 0, 0);
  const b = new Router("b", "B", 100, 0);
  const c = new Router("c", "C", 200, 0);

  const aOut = new NetworkInterface("a-out", "eth0", a);
  const bIn = new NetworkInterface("b-in", "eth0", b);
  const bOut = new NetworkInterface("b-out", "eth1", b);
  const cIn = new NetworkInterface("c-in", "eth0", c);

  a.interfaces.push(aOut);
  b.interfaces.push(bIn, bOut);
  c.interfaces.push(cIn);

  const linkAB = new Link("link-ab", aOut, bIn);
  const linkBC = new Link("link-bc", bOut, cIn);

  const vehicle = new Vehicle("v1", createMovement([linkAB, linkBC], VEHICLE_SPEED));
  const movementSystem = new MovementSystem([vehicle]);
  const deliverySystem = new DeliverySystem([vehicle], movementSystem);

  return { a, b, c, linkAB, linkBC, vehicle, movementSystem, deliverySystem };
}

test("vehicle stops before a down link", () => {
  const { b, linkBC, vehicle, deliverySystem } = buildChain();
  linkBC.status = "down";

  // First tick crosses the (up) A->B segment and reaches the blocked
  // boundary; a second tick confirms it stays put rather than teleporting
  // or continuing.
  deliverySystem.update(2);
  deliverySystem.update(1);

  assert.deepEqual(vehicle.position, b.connectionPoint);
  assert.equal(vehicle.movement.progress, 0);
});

test("deliveryBlocked fires exactly once", () => {
  const { linkBC, deliverySystem } = buildChain();
  linkBC.status = "down";

  const events: { vehicleId: string; blockedLinkId: string; currentNodeId: string }[] = [];
  deliverySystem.onBlocked.on((event) => {
    events.push(event);
  });

  deliverySystem.update(2);
  deliverySystem.update(1);
  deliverySystem.update(1);

  assert.equal(events.length, 1);
  assert.deepEqual(events[0], {
    vehicleId: "v1",
    blockedLinkId: "link-bc",
    currentNodeId: "b",
  });
});

test("delivery succeeds when every link is up", () => {
  const { c, vehicle, movementSystem, deliverySystem } = buildChain();

  const arrivals: string[] = [];
  movementSystem.onArrival.on(({ vehicleId }) => {
    arrivals.push(vehicleId);
  });

  // Total path is 200 units at 100 units/sec: 2s needed, plus slack.
  deliverySystem.update(3);

  assert.deepEqual(vehicle.position, c.connectionPoint);
  assert.deepEqual(arrivals, ["v1"]);
});
