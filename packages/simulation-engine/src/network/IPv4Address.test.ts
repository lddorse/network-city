import { test } from "node:test";
import assert from "node:assert/strict";
import { IPv4Address } from "./IPv4Address.ts";

test("valid IPv4 address creation", () => {
  const address = new IPv4Address("192.168.1.10", 24);

  assert.equal(address.address, "192.168.1.10");
  assert.equal(address.prefixLength, 24);
});

test("invalid octet rejection", () => {
  assert.throws(() => new IPv4Address("192.168.1.256", 24));
  assert.throws(() => new IPv4Address("300.0.0.1", 24));
});

test("malformed address rejection", () => {
  assert.throws(() => new IPv4Address("192.168.1", 24));
  assert.throws(() => new IPv4Address("192.168.1.1.1", 24));
  assert.throws(() => new IPv4Address("abc.def.ghi.jkl", 24));
  assert.throws(() => new IPv4Address("", 24));
});

test("prefix below 0 rejection", () => {
  assert.throws(() => new IPv4Address("10.0.0.1", -1));
});

test("prefix above 32 rejection", () => {
  assert.throws(() => new IPv4Address("10.0.0.1", 33));
});

test("CIDR string formatting", () => {
  assert.equal(new IPv4Address("10.0.0.1", 30).toCidr(), "10.0.0.1/30");
});
