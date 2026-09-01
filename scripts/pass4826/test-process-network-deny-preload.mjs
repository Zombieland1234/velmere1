import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import test from "node:test";

const preload = path.resolve("scripts/pass4826/process-network-deny-preload.cjs");

test("process-level preload blocks common Node network entry points without claiming an air-gap", () => {
  const script = String.raw`
    const assert = require("node:assert/strict");
    const fs = require("node:fs");
    const checks = [
      ["http.request", () => require("node:http").request("http://127.0.0.1/")],
      ["https.get", () => require("node:https").get("https://127.0.0.1/")],
      ["net.connect", () => require("node:net").connect(1, "127.0.0.1")],
      ["tls.connect", () => require("node:tls").connect(1, "127.0.0.1")],
      ["http2.connect", () => require("node:http2").connect("https://127.0.0.1")],
      ["net.Server.listen", () => require("node:net").createServer().listen(0)],
      ["dns.lookup", () => require("node:dns").lookup("localhost", () => {})],
      ["dns.Resolver.resolve4", () => new (require("node:dns").Resolver)().resolve4("localhost", () => {})],
      ["dgram.createSocket", () => require("node:dgram").createSocket("udp4")],
      ["fetch", () => globalThis.fetch("http://127.0.0.1/")],
    ];
    for (const [name, operation] of checks) {
      assert.throws(operation, (error) => error?.code === "VELMERE_PROCESS_NETWORK_DENIED", name);
    }
    assert.equal(process.env.VELMERE_PROCESS_NETWORK_DENY_ACTIVE, "1");
    assert.equal(process.env.VELMERE_NETWORK_ISOLATION_LEVEL, "process_preload_only");
    assert.deepEqual(globalThis.__VELMERE_PROCESS_NETWORK_DENY__, {
      active: true,
      level: "process_preload_only",
      errorCode: "VELMERE_PROCESS_NETWORK_DENIED",
    });
    assert.equal(fs.readFileSync(process.execPath).length > 0, true);
  `;
  const result = spawnSync(process.execPath, ["--require", preload, "--eval", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("preload advertises only process-level containment", () => {
  const source = String.raw`
    process.stdout.write(JSON.stringify(globalThis.__VELMERE_PROCESS_NETWORK_DENY__));
  `;
  const result = spawnSync(process.execPath, ["--require", preload, "--eval", source], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(result.status, 0, result.stderr);
  const evidence = JSON.parse(result.stdout);
  assert.equal(evidence.level, "process_preload_only");
  assert.notEqual(evidence.level, "os_network_namespace");
});
