#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { executePass35AuditA01A05, type Pass35AuditA01A05Input } from "../../lib/security/audit-a01-a05-engine.ts";

const base = JSON.parse(readFileSync("fixtures/pass35/audit-a01-a05/synthetic-risky-upgradeable.json", "utf8")) as Pass35AuditA01A05Input;

const vulnerableSources = [
  { path: "legacy.sol", content: `pragma solidity ^0.4.15;
contract Rubixi {
  address private creator;
  function DynamicPyramid() public { creator = msg.sender; }
}` },
  { path: "reentrancy.sol", content: `pragma solidity ^0.8.24;
contract ReentrantVault {
  mapping(address => uint256) private balances;
  function withdraw() public {
    uint256 amount = balances[msg.sender];
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] = 0;
  }
}` },
];

const control = `pragma solidity ^0.8.24;
contract Controlled {
  address private immutable owner;
  mapping(address => uint256) private balances;
  constructor() { owner = msg.sender; }
  function mint(address to, uint256 amount) external { require(msg.sender == owner); balances[to] += amount; }
  function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
    (bool ok,) = msg.sender.call{value: amount}("");
    require(ok);
  }
}`;

function input(label: "BASIC" | "PRO" | "ADVANCED", sources: Array<{ path: string; content: string }>): Pass35AuditA01A05Input {
  const value = structuredClone(base);
  value.caseRef = `AUD-R44P14-${label}`;
  value.projectName = `R44P14 ${label}`;
  value.sourceFiles = sources;
  value.inputClass = "SYNTHETIC_OFFLINE";
  value.sourceProvenance.verifiedSource = false;
  value.sourceProvenance.sourceReference = "local-project-owned-r44p14-test";
  return value;
}

const deliveryVariants = ["BASIC", "PRO", "ADVANCED"] as const;
const rows: Array<Record<string, unknown>> = [];
for (const label of deliveryVariants) {
  const result = executePass35AuditA01A05(input(label, vulnerableSources));
  const titles = result.findings.map((finding) => finding.title);
  assert.ok(titles.includes("Legacy constructor name mismatch"), `${label}: missing legacy constructor finding`);
  assert.ok(titles.includes("External interaction precedes state effect"), `${label}: missing reentrancy-order finding`);
  assert.equal(result.summary.paidDeliveryAllowed, false);
  rows.push({ label, findingCount: result.findings.length, titles, paidDeliveryAllowed: result.summary.paidDeliveryAllowed });
}

const controlResult = executePass35AuditA01A05(input("ADVANCED", [{ path: "case.sol", content: control }]));
const controlTitles = controlResult.findings.map((finding) => finding.title);
assert.equal(controlTitles.includes("Unchecked low-level call result"), false);
assert.equal(controlTitles.includes("Externally callable mint lacks authorization"), false);
assert.equal(controlTitles.includes("External interaction precedes state effect"), false);

const receipt = {
  schemaVersion: "velmere.pass36.a102r44p14.audit-delivery-structured-findings.v2",
  status: "PASS",
  checks: 12,
  passed: 12,
  failed: 0,
  deliveryVariants: rows,
  controlFindingCount: controlResult.findings.length,
  controlTitles,
  truthBoundary: {
    localSyntheticTest: true,
    tierEntitlementNotExercisedByThisEngine: true,
    externalAccuracyCredit: false,
    customerCredit: false,
    saleCredit: false,
    liveCredit: false,
  },
};
console.log(JSON.stringify(receipt, null, 2));
