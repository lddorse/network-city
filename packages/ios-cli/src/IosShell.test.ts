import { test } from "node:test";
import assert from "node:assert/strict";
import { Router, NetworkInterface, IPv4Address } from "@network-city/simulation-engine";
import { IosShell } from "./IosShell.ts";

function routerWithInterfaces(): Router {
  const router = new Router("r1", "R1", 0, 0);

  const gi00 = new NetworkInterface("r1-gi0/0", "Gi0/0", router);
  gi00.ipv4 = new IPv4Address("192.168.1.1", 24);

  const gi01 = new NetworkInterface("r1-gi0/1", "Gi0/1", router);
  gi01.ipv4 = new IPv4Address("10.0.0.1", 30);

  router.interfaces.push(gi00, gi01);
  return router;
}

test("initial prompt is user exec", () => {
  const shell = new IosShell(routerWithInterfaces());
  assert.equal(shell.prompt, "R1>");
});

test("enable moves to privileged exec", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  assert.equal(shell.mode, "privileged");
  assert.equal(shell.prompt, "R1#");
});

test("en is an alias for enable", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("en");
  assert.equal(shell.mode, "privileged");
  assert.equal(shell.prompt, "R1#");
});

test("disable returns to user exec", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("disable");
  assert.equal(shell.mode, "user");
  assert.equal(shell.prompt, "R1>");
});

test("configure terminal and its conf t alias both enter global config", () => {
  const long = new IosShell(routerWithInterfaces());
  long.execute("enable");
  long.execute("configure terminal");
  assert.equal(long.prompt, "R1(config)#");

  const short = new IosShell(routerWithInterfaces());
  short.execute("enable");
  short.execute("conf t");
  assert.equal(short.prompt, "R1(config)#");
});

test("configure and conf alone are incomplete, not invalid, and do not change mode", () => {
  const configureShell = new IosShell(routerWithInterfaces());
  configureShell.execute("enable");
  const configureOutput = configureShell.execute("configure");
  assert.deepEqual(configureOutput, ["% Incomplete command."]);
  assert.equal(configureShell.mode, "privileged");

  const confShell = new IosShell(routerWithInterfaces());
  confShell.execute("enable");
  const confOutput = confShell.execute("conf");
  assert.deepEqual(confOutput, ["% Incomplete command."]);
  assert.equal(confShell.mode, "privileged");
});

test("interface and int alone are incomplete, not invalid", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("configure terminal");

  const output = shell.execute("interface");
  assert.deepEqual(output, ["% Incomplete command."]);
  assert.equal(shell.mode, "config");
});

test("exit and end navigate config levels back to privileged exec", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("configure terminal");
  shell.execute("interface Gi0/0");
  assert.equal(shell.prompt, "R1(config-if)#");

  shell.execute("exit");
  assert.equal(shell.prompt, "R1(config)#");

  shell.execute("interface Gi0/0");
  shell.execute("end");
  assert.equal(shell.prompt, "R1#");
});

test("interface navigation is case-insensitive and tracks the current interface", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("configure terminal");
  shell.execute("interface gi0/1");

  assert.equal(shell.prompt, "R1(config-if)#");
  assert.equal(shell.currentInterface?.name, "Gi0/1");
});

test("int is an alias for interface and also matches case-insensitively", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("configure terminal");
  shell.execute("int GI0/0");

  assert.equal(shell.prompt, "R1(config-if)#");
  assert.equal(shell.currentInterface?.name, "Gi0/0");
});

test("interface command for a nonexistent interface is invalid input", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("configure terminal");

  const output = shell.execute("interface Gi0/9");
  assert.deepEqual(output, ["% Invalid input detected at '^' marker."]);
  assert.equal(shell.prompt, "R1(config)#");
});

test("unknown command produces a Cisco-style error", () => {
  const shell = new IosShell(routerWithInterfaces());
  const output = shell.execute("frobulate");
  assert.deepEqual(output, ["% Invalid input detected at '^' marker."]);
});

test("privileged-only command typed in user exec is invalid, not a mode switch", () => {
  const shell = new IosShell(routerWithInterfaces());
  const output = shell.execute("configure terminal");
  assert.deepEqual(output, ["% Invalid input detected at '^' marker."]);
  assert.equal(shell.mode, "user");
});

test("config-only command typed in privileged exec is invalid", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  const output = shell.execute("interface Gi0/0");
  assert.deepEqual(output, ["% Invalid input detected at '^' marker."]);
  assert.equal(shell.mode, "privileged");
});

test("no configuration commands are accepted in config-if mode", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("configure terminal");
  shell.execute("interface Gi0/0");

  const output = shell.execute("no shutdown");
  assert.deepEqual(output, ["% Invalid input detected at '^' marker."]);
  assert.equal(shell.mode, "config-if");
});

test("blank input produces no output and is not recorded in history", () => {
  const shell = new IosShell(routerWithInterfaces());
  const output = shell.execute("   ");
  assert.deepEqual(output, []);
  assert.deepEqual(shell.history, []);
});

test("history records normalized non-blank commands in order", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  shell.execute("  configure   terminal  ");
  assert.deepEqual(shell.history, ["enable", "configure terminal"]);
});

test("show ip interface brief is available in privileged exec", () => {
  const shell = new IosShell(routerWithInterfaces());
  shell.execute("enable");
  const output = shell.execute("show ip interface brief");
  assert.equal(output[0].startsWith("Interface"), true);
  assert.equal(output.length, 3);
});

test("show commands are not available in user exec", () => {
  const shell = new IosShell(routerWithInterfaces());
  const output = shell.execute("show ip route");
  assert.deepEqual(output, ["% Invalid input detected at '^' marker."]);
});
