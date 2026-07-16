import { test } from "node:test";
import assert from "node:assert/strict";
import { Router, NetworkInterface, IPv4Address } from "@network-city/simulation-engine";
import { showIpInterfaceBrief } from "./showIpInterfaceBrief.ts";

test("addressed, operationally up interface reports its address and up/up", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  iface.ipv4 = new IPv4Address("192.168.1.1", 24);
  router.interfaces.push(iface);

  const [, row] = showIpInterfaceBrief(router);

  assert.match(row, /^Gi0\/0\s+192\.168\.1\.1\s+YES\s+manual\s+up\s+up$/);
});

test("unaddressed interface reports unassigned and unset method", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  router.interfaces.push(iface);

  const [, row] = showIpInterfaceBrief(router);

  assert.match(row, /^Gi0\/0\s+unassigned\s+YES\s+unset\s+up\s+up$/);
});

// administrativeStatus/operationalStatus are set directly rather than
// derived via InterfaceStatusSystem, matching how RoutingTableSystem's own
// tests exercise this field — this file only tests the formatter, not
// derivation.
test("administratively down interface reports administratively down status", () => {
  const router = new Router("r1", "R1", 0, 0);
  const iface = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  iface.ipv4 = new IPv4Address("192.168.1.1", 24);
  iface.administrativeStatus = "down";
  iface.operationalStatus = "down";
  router.interfaces.push(iface);

  const [, row] = showIpInterfaceBrief(router);

  assert.match(row, /^Gi0\/0\s+192\.168\.1\.1\s+YES\s+manual\s+administratively down\s+down$/);
});

test("header row lists the standard Cisco columns", () => {
  const router = new Router("r1", "R1", 0, 0);
  const [header] = showIpInterfaceBrief(router);

  assert.match(header, /^Interface\s+IP-Address\s+OK\?\s+Method\s+Status\s+Protocol$/);
});

test("one row per interface, in router.interfaces order", () => {
  const router = new Router("r1", "R1", 0, 0);
  const gi00 = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  const gi01 = new NetworkInterface("r1-gi0/1", "Gi0/1", router);
  router.interfaces.push(gi00, gi01);

  const output = showIpInterfaceBrief(router);

  assert.equal(output.length, 3);
  assert.equal(output[1].startsWith("Gi0/0"), true);
  assert.equal(output[2].startsWith("Gi0/1"), true);
});
