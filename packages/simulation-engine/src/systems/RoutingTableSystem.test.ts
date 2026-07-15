import { test } from "node:test";
import assert from "node:assert/strict";
import { Router } from "../entities/Router.ts";
import { NetworkInterface } from "../entities/NetworkInterface.ts";
import { IPv4Address } from "../network/IPv4Address.ts";
import { RoutingTableSystem } from "./RoutingTableSystem.ts";

function routesByType(router: Router, type: "Connected" | "Local") {
  return router.routingTable.routes.filter((route) => route.type === type);
}

test("operational addressed interface creates one Connected route", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  iface.ipv4 = new IPv4Address("192.168.1.1", 24);
  router.interfaces.push(iface);

  new RoutingTableSystem([router]).rebuild();

  const connected = routesByType(router, "Connected");
  assert.equal(connected.length, 1);
  assert.equal(connected[0].destination, "192.168.1.0");
  assert.equal(connected[0].prefixLength, 24);
  assert.equal(connected[0].outgoingInterfaceId, "r1-gi0/0");
});

test("operational addressed interface creates one Local route", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  iface.ipv4 = new IPv4Address("192.168.1.1", 24);
  router.interfaces.push(iface);

  new RoutingTableSystem([router]).rebuild();

  const local = routesByType(router, "Local");
  assert.equal(local.length, 1);
  assert.equal(local[0].destination, "192.168.1.1");
  assert.equal(local[0].prefixLength, 32);
  assert.equal(local[0].outgoingInterfaceId, "r1-gi0/0");
});

test("interface down removes both routes", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  iface.ipv4 = new IPv4Address("192.168.1.1", 24);
  router.interfaces.push(iface);

  const system = new RoutingTableSystem([router]);
  system.rebuild();
  assert.equal(router.routingTable.routes.length, 2);

  iface.operationalStatus = "down";
  system.rebuild();

  assert.equal(router.routingTable.routes.length, 0);
});

test("interface without IPv4 creates no routes", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  router.interfaces.push(iface);

  new RoutingTableSystem([router]).rebuild();

  assert.equal(router.routingTable.routes.length, 0);
});

test("multiple operational addressed interfaces produce multiple Connected and Local routes, Connected first", () => {
  const router = new Router("r1", "R1", 0, 0);

  const gi00 = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  gi00.ipv4 = new IPv4Address("192.168.1.1", 24);

  const gi01 = new NetworkInterface("r1-gi0/1", "Gi0/1", router);
  gi01.ipv4 = new IPv4Address("10.0.0.1", 30);

  router.interfaces.push(gi00, gi01);

  new RoutingTableSystem([router]).rebuild();

  assert.equal(router.routingTable.routes.length, 4);
  assert.deepEqual(
    router.routingTable.routes.map((route) => route.type),
    ["Connected", "Connected", "Local", "Local"]
  );
});

test("rebuilding does not create duplicates", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  iface.ipv4 = new IPv4Address("192.168.1.1", 24);
  router.interfaces.push(iface);

  const system = new RoutingTableSystem([router]);
  system.rebuild();
  system.rebuild();
  system.rebuild();

  assert.equal(router.routingTable.routes.length, 2);
});
