#!/usr/bin/env node
import { commitEvidenceAdmission } from "./a102r44p27-external-evidence-admission-journal.mjs";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const options = {
  sourceRoot: arg("--source-root"),
  admissionRoot: arg("--admission-root"),
  revisionId: arg("--revision"),
  sourceManifestSha256: arg("--source"),
  policySha256: arg("--policy"),
  evidenceId: arg("--evidence-id"),
  nonce: arg("--nonce"),
  envelopeSha256: arg("--envelope"),
  payloadSha256: arg("--payload"),
  keyId: arg("--key-id"),
  programId: arg("--program-id"),
  executionId: arg("--execution-id"),
  observedAt: arg("--observed-at"),
  maximumWaitMs: 15_000,
};

try {
  const result = commitEvidenceAdmission(options);
  console.log(JSON.stringify({ status: "PASS", result }));
  process.exit(0);
} catch (error) {
  console.log(JSON.stringify({ status: "REJECTED", error: String(error?.message ?? error) }));
  process.exit(String(error?.message ?? error).includes("replay") ? 4 : 3);
}
