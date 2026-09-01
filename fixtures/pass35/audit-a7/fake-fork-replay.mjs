#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args.includes("--version")) { console.log("velmere-fork-replay-fixture 1.0.0"); process.exit(0); }
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
if (args[0] !== "replay" || !value("--case") || !args.includes("--json")) { console.error("usage"); process.exit(2); }
const input = JSON.parse(readFileSync(value("--case"), "utf8"));
const variant = value("--fixture-variant") ?? "REFERENCE";
const hash = (v) => `sha256:${createHash("sha256").update(String(v)).digest("hex")}`;
const transactions = input.expectedTransactions.map((row) => ({
  txHash: row.txHash,
  status: row.expectedStatus,
  gasUsed: 21000 + Number.parseInt(row.txHash.slice(-4), 16) % 100000,
  stateDiffSha256: row.expectedStateDiffSha256,
  logsSha256: row.expectedLogsSha256,
  returnDataSha256: row.expectedReturnDataSha256,
}));
const assertions = input.requiredAssertions.map((row) => ({ assertionId: row.assertionId, status: "PASS", observedSha256: row.expectedObservationSha256 }));
const out = {
  schemaVersion: "velmere.pass35.audit-a7-fork-tool-output.v1",
  chainId: input.chainId,
  blockNumber: input.blockNumber,
  blockHash: input.blockHash,
  preStateRoot: input.preStateRoot,
  postStateRoot: input.expectedPostStateRoot,
  replayTraceSha256: hash(`trace:${input.caseRef}:${input.replayPlanSha256}`),
  snapshotReadRootSha256: hash(`snapshot:${input.blockHash}:${input.preStateRoot}`),
  transactions,
  assertions,
};
if (variant === "WRONG_CHAIN") out.chainId = String(BigInt(input.chainId) + 1n);
if (variant === "WRONG_BLOCK_HASH") out.blockHash = `0x${"9".repeat(64)}`;
if (variant === "PRE_STATE_DRIFT") out.preStateRoot = `0x${"8".repeat(64)}`;
if (variant === "POST_STATE_DRIFT") out.postStateRoot = `0x${"7".repeat(64)}`;
if (variant === "TX_FAILURE" && out.transactions[0]) out.transactions[0].status = out.transactions[0].status === "SUCCESS" ? "REVERT" : "SUCCESS";
if (variant === "ASSERTION_FAILURE" && out.assertions[0]) out.assertions[0].status = "FAIL";
if (variant === "DROP_TRANSACTION") out.transactions.pop();
console.log(JSON.stringify(out));
