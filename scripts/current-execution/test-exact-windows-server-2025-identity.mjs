#!/usr/bin/env node
import assert from "node:assert/strict";
import { EXACT_TARGET, evaluateExactWindowsServer2025 } from "./verify-exact-windows-server-2025.mjs";

const server = {
  caption: "Microsoft Windows Server 2025 Datacenter",
  version: "10.0.26100",
  buildNumber: "26100",
  osArchitecture: "64-bit",
  productType: 3,
  productName: "Windows Server 2025 Datacenter",
  installationType: "Server",
  editionId: "ServerDatacenter",
  currentBuildNumber: "26100",
  ubr: 33158,
  displayVersion: "24H2",
};
const runtime = {
  platform: EXACT_TARGET.platform,
  arch: EXACT_TARGET.arch,
  node: EXACT_TARGET.node,
  npm: EXACT_TARGET.npm,
  githubActions: true,
  runnerOs: "Windows",
  imageOs: "win25",
};

const exact = evaluateExactWindowsServer2025({ runtime, osIdentity: server });
assert.equal(exact.pass, true);
assert.deepEqual(exact.blockers, []);

const client = evaluateExactWindowsServer2025({
  runtime: { ...runtime, githubActions: false, runnerOs: null, imageOs: null },
  osIdentity: {
    ...server,
    caption: "Microsoft Windows 11 Pro",
    productName: "Windows 10 Pro",
    installationType: "Client",
    editionId: "Professional",
    productType: 1,
    version: "10.0.26200",
    buildNumber: "26200",
    currentBuildNumber: "26200",
  },
});
assert.equal(client.pass, false);
for (const blocker of [
  "EXACT_TARGET_MISMATCH_CAPTION",
  "EXACT_TARGET_MISMATCH_PRODUCTNAME",
  "EXACT_TARGET_MISMATCH_PRODUCTTYPE",
  "EXACT_TARGET_MISMATCH_INSTALLATIONTYPE",
  "EXACT_TARGET_MISMATCH_EDITIONID",
  "EXACT_TARGET_MISMATCH_OSBASEBUILD",
  "EXACT_TARGET_MISMATCH_REGISTRYBASEBUILD",
  "EXACT_TARGET_MISMATCH_VERSION",
]) assert.ok(client.blockers.includes(blocker), blocker);

const server2022 = evaluateExactWindowsServer2025({
  runtime,
  osIdentity: {
    ...server,
    caption: "Microsoft Windows Server 2022 Datacenter",
    productName: "Windows Server 2022 Datacenter",
    version: "10.0.20348",
    buildNumber: "20348",
    currentBuildNumber: "20348",
  },
});
assert.equal(server2022.pass, false);

const wrongToolchain = evaluateExactWindowsServer2025({
  runtime: { ...runtime, node: "v24.17.0", npm: "11.15.0" },
  osIdentity: server,
});
assert.equal(wrongToolchain.pass, false);
assert.ok(wrongToolchain.blockers.includes("EXACT_TARGET_MISMATCH_NODE"));
assert.ok(wrongToolchain.blockers.includes("EXACT_TARGET_MISMATCH_NPM"));

const forgedRunnerLabelOnClient = evaluateExactWindowsServer2025({ runtime, osIdentity: { ...server, productType: 1, installationType: "Client" } });
assert.equal(forgedRunnerLabelOnClient.pass, false);
assert.ok(forgedRunnerLabelOnClient.blockers.includes("EXACT_TARGET_MISMATCH_PRODUCTTYPE"));
assert.ok(forgedRunnerLabelOnClient.blockers.includes("EXACT_TARGET_MISMATCH_INSTALLATIONTYPE"));

console.log(JSON.stringify({ status: "PASS", cases: 5, exactTarget: EXACT_TARGET }, null, 2));
