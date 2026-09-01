#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  assertExternalOutput, buildPhase1UnsealedCandidate, parseControllerArguments,
  readReceiptSet, sameSourceSnapshot, sourceAuthoritySnapshot,
  verifyPhase1UnsealedCandidate,
} from "./a80r1-two-phase-release-controller-lib.mjs";

function main() {
  const options = parseControllerArguments(process.argv.slice(2));
  const output = assertExternalOutput(options.sourceRoot, options.output);
  const before = sourceAuthoritySnapshot(options.sourceRoot);
  const observedReceipts = readReceiptSet(options.evidenceRoot);
  const candidate = buildPhase1UnsealedCandidate({ source: before, observedReceipts });
  const after = sourceAuthoritySnapshot(options.sourceRoot);
  if (!sameSourceSnapshot(before, after)) throw new Error("a80r1_source_changed_during_phase1");
  if (!verifyPhase1UnsealedCandidate(candidate).passed) throw new Error("a80r1_phase1_self_verification_failed");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(candidate, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify(candidate, null, 2)}\n`);
}

try { main(); }
catch (error) {
  process.stderr.write(`${JSON.stringify({ schemaVersion: "velmere.pass36.a102r42.a80r1-phase1-unsealed-candidate.v1", status: "FAIL_A80R1_PHASE1_CONTROLLER", error: error instanceof Error ? error.message : String(error), globalDecision: "NO_GO", live: false, saleEnabled: false, productionApproved: false, worldClassProven: false })}\n`);
  process.exitCode = 1;
}
