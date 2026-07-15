import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveOperationalStatus } from "./InterfaceStatusSystem.ts";

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
