import { pathToFileURL } from "node:url";

import {
  assertPass4816ExactToolchain,
  parseConfigArgument,
  readPass4816VerifyConfig,
  verifyPass4816ObservabilityReceipt,
} from "./tooling";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  assertPass4816ExactToolchain();
  const configPath = parseConfigArgument(argv);
  const config = await readPass4816VerifyConfig(configPath);
  const verification = await verifyPass4816ObservabilityReceipt(config);
  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    liveCredit: false,
    verified: verification.verified,
    observabilityVerified: verification.observabilityVerified,
    telemetryBound: verification.telemetryBound,
    sloVerified: verification.sloVerified,
    incidentResponseVerified: verification.incidentResponseVerified,
    safeDegradationVerified: verification.safeDegradationVerified,
    observabilityRollbackProtected: verification.observabilityRollbackProtected,
    observabilitySequence: verification.observabilitySequence,
    receiptDigest: verification.observabilityReceiptDigest,
    objectiveCount: verification.objectiveCount,
  })}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invokedPath === import.meta.url) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "pass4816_verifier_failed"}\n`);
    process.exitCode = 1;
  });
}
