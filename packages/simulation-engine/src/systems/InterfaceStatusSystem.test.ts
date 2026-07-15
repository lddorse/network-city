import { test } from "node:test";
import assert from "node:assert/strict";
import { Router } from "../entities/Router.ts";
import { NetworkInterface } from "../entities/NetworkInterface.ts";
import { Link } from "../entities/Link.ts";
import { deriveOperationalStatus, InterfaceStatusSystem } from "./InterfaceStatusSystem.ts";

test("admin down + link up => oper down", () => {
  assert.equal(deriveOperationalStatus("down", "up"), "down");
});

test("admin down + link down => oper down", () => {
  assert.equal(deriveOperationalStatus("down", "down"), "down");
});

test("admin up + link up => oper up", () => {
  assert.equal(deriveOperationalStatus("up", "up"), "up");
});

test("admin up + link down => oper down", () => {
  assert.equal(deriveOperationalStatus("up", "down"), "down");
});

test("admin up + no connected link => oper down", () => {
  assert.equal(deriveOperationalStatus("up", undefined), "down");
});

test("interfaces become operationally down when their link fails", () => {
  const a = new Router("a", "A", 0, 0);
  const b = new Router("b", "B", 100, 0);
  const aOut = new NetworkInterface("a-out", "eth0", a);
  const bIn = new NetworkInterface("b-in", "eth0", b);
  a.interfaces.push(aOut);
  b.interfaces.push(bIn);

  const link = new Link("link-ab", aOut, bIn);
  const system = new InterfaceStatusSystem([a, b], [link]);

  system.recompute();
  assert.equal(aOut.operationalStatus, "up");
  assert.equal(bIn.operationalStatus, "up");

  link.status = "down";
  system.recompute();

  assert.equal(aOut.operationalStatus, "down");
  assert.equal(bIn.operationalStatus, "down");
});
