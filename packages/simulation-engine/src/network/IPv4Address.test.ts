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

test("192.168.1.10/24 -> network 192.168.1.0", () => {
  assert.equal(new IPv4Address("192.168.1.10", 24).networkAddress(), "192.168.1.0");
});

test("192.168.1.10/24 -> broadcast 192.168.1.255", () => {
  assert.equal(new IPv4Address("192.168.1.10", 24).broadcastAddress(), "192.168.1.255");
});

test("10.0.0.1/30 -> mask 255.255.255.252", () => {
  assert.equal(new IPv4Address("10.0.0.1", 30).subnetMask(), "255.255.255.252");
});

test("10.0.0.1/30 and 10.0.0.2/30 have matching subnet configuration", () => {
  const a = new IPv4Address("10.0.0.1", 30);
  const b = new IPv4Address("10.0.0.2", 30);
  assert.equal(a.hasMatchingSubnetConfiguration(b), true);
});

test("192.168.1.10/24 and 192.168.2.10/24 do not have matching subnet configuration", () => {
  const a = new IPv4Address("192.168.1.10", 24);
  const b = new IPv4Address("192.168.2.10", 24);
  assert.equal(a.hasMatchingSubnetConfiguration(b), false);
});

test("/32 behavior", () => {
  const address = new IPv4Address("10.0.0.5", 32);

  assert.equal(address.networkAddress(), "10.0.0.5");
  assert.equal(address.broadcastAddress(), "10.0.0.5");
  assert.equal(address.subnetMask(), "255.255.255.255");
  assert.deepEqual(address.hostAddressRange(), { first: "10.0.0.5", last: "10.0.0.5" });
});

test("/0 behavior", () => {
  const address = new IPv4Address("192.168.1.10", 0);

  assert.equal(address.networkAddress(), "0.0.0.0");
  assert.equal(address.broadcastAddress(), "255.255.255.255");
  assert.equal(address.subnetMask(), "0.0.0.0");
});

test("/31 host range includes both addresses", () => {
  const address = new IPv4Address("10.0.0.0", 31);
  assert.deepEqual(address.hostAddressRange(), { first: "10.0.0.0", last: "10.0.0.1" });
});

test("/24 host range excludes network and broadcast", () => {
  const address = new IPv4Address("192.168.1.10", 24);
  assert.deepEqual(address.hostAddressRange(), { first: "192.168.1.1", last: "192.168.1.254" });
});

test("invalid inputs remain rejected", () => {
  assert.throws(() => new IPv4Address("999.1.1.1", 24));
  assert.throws(() => new IPv4Address("10.0.0.1", 40));
});
