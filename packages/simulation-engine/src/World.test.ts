import { test } from "node:test";
import assert from "node:assert/strict";
import { World } from "./World.ts";

function tick(world: World, steps: number, delta: number): void {
  for (let i = 0; i < steps; i++) {
    world.update(delta);
  }
}

function requireRouter(world: World, hostname: string) {
  const router = world.routers.find((candidate) => candidate.hostname === hostname);
  if (!router) {
    throw new Error(`no router named ${hostname}`);
  }
  return router;
}

function requireInterface(world: World, hostname: string, name: string) {
  const router = requireRouter(world, hostname);
  const iface = router.interfaces.find((candidate) => candidate.name === name);
  if (!iface) {
    throw new Error(`no interface ${name} on ${hostname}`);
  }
  return iface;
}

// World's connectionPoints come from irrational link-length math (sqrt-based
// distances), so a blocked vehicle's final position can be a handful of ULPs
// off the router's own point rather than bit-identical to it.
function assertNear(
  actual: { x: number; y: number },
  expected: { x: number; y: number },
  epsilon = 1e-6
): void {
  const dx = actual.x - expected.x;
  const dy = actual.y - expected.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  assert.ok(
    distance <= epsilon,
    `expected position near (${expected.x}, ${expected.y}), got (${actual.x}, ${actual.y})`
  );
}

test("vehicles do not accumulate without bound as deliveries complete", () => {
  const world = new World();

  const arrivals: string[] = [];
  world.movementSystem.onArrival.on(({ vehicleId }) => arrivals.push(vehicleId));

  // 30 simulated seconds: several 5s spawn intervals, each delivery
  // completing the House -> R1 -> R2 -> Hospital path well before the next
  // one or two spawn behind it, so vehicles should never pile up.
  tick(world, 300, 0.1);

  assert.ok(arrivals.length >= 3, `expected several arrivals, got ${arrivals.length}`);
  assert.ok(world.vehicles.length <= 3, `vehicles should not accumulate, got ${world.vehicles.length}`);
});

test("deliveries stop before entering a link whose interface has been shut down", () => {
  const world = new World();
  const r1Gi01 = requireInterface(world, "R1", "Gi0/1");
  r1Gi01.administrativeStatus = "down";

  const arrivals: string[] = [];
  world.movementSystem.onArrival.on(({ vehicleId }) => arrivals.push(vehicleId));

  const blocked: string[] = [];
  world.deliverySystem.onBlocked.on(({ vehicleId, blockedLinkId }) => {
    blocked.push(vehicleId);
    assert.equal(blockedLinkId, "r1-r2");
  });

  // 30 simulated seconds: enough for several deliveries to spawn, reach R1,
  // and queue up there since Gi0/1 never comes back up in this test.
  tick(world, 300, 0.1);

  assert.equal(arrivals.length, 0, "no delivery should reach the hospital while Gi0/1 is down");
  assert.ok(blocked.length >= 2, `expected multiple deliveries to be blocked, got ${blocked.length}`);

  const r1 = requireRouter(world, "R1");
  for (const vehicle of world.vehicles) {
    assertNear(vehicle.position, r1.connectionPoint);
  }
});

test("blocked deliveries resume once the interface is no longer shut down", () => {
  const world = new World();
  const r1Gi01 = requireInterface(world, "R1", "Gi0/1");
  r1Gi01.administrativeStatus = "down";

  const arrivals: string[] = [];
  world.movementSystem.onArrival.on(({ vehicleId }) => arrivals.push(vehicleId));

  // Let deliveries queue up at R1 while the interface is down.
  tick(world, 100, 0.1); // 10 simulated seconds
  assert.equal(arrivals.length, 0);
  assert.ok(world.vehicles.length >= 1, "at least one delivery should be queued at R1");

  r1Gi01.administrativeStatus = "up";

  // Plenty of time for the queued deliveries to cross R1 -> R2 -> Hospital.
  tick(world, 300, 0.1); // 30 more simulated seconds

  assert.ok(arrivals.length >= 1, `expected queued deliveries to resume and arrive, got ${arrivals.length}`);
});
