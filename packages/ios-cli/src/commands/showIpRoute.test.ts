import { test } from "node:test";
import assert from "node:assert/strict";
import { Router, NetworkInterface, IPv4Address, RoutingTableSystem } from "@network-city/simulation-engine";
import { showIpRoute } from "./showIpRoute.ts";

function routerWithOneAddressedInterface(): Router {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  iface.ipv4 = new IPv4Address("192.168.1.1", 24);
  router.interfaces.push(iface);
  new RoutingTableSystem([router]).rebuild();
  return router;
}

test("gateway of last resort is not set when no routes exist", () => {
  const router = new Router("r1", "R1", 0, 0);
  const output = showIpRoute(router);

  assert.equal(output.includes("Gateway of last resort is not set"), true);
});

test("connected and local routes are rendered with their outgoing interface name", () => {
  const router = routerWithOneAddressedInterface();
  const output = showIpRoute(router);

  assert.equal(output.includes("C 192.168.1.0/24 is directly connected, Gi0/0"), true);
  assert.equal(output.includes("L 192.168.1.1/32 is directly connected, Gi0/0"), true);
});

test("codes legend is derived from the route type codes actually used", () => {
  const router = new Router("r1", "R1", 0, 0);
  const [legend] = showIpRoute(router);

  assert.equal(legend, "Codes: C - connected, L - local");
});

test("routing table with no routes still renders the legend and gateway line", () => {
  const router = new Router("r1", "R1", 0, 0);
  const output = showIpRoute(router);

  assert.deepEqual(output, [
    "Codes: C - connected, L - local",
    "",
    "Gateway of last resort is not set",
    "",
  ]);
});
