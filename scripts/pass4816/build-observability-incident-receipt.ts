import { pathToFileURL } from "node:url";

import {
  assertPass4816ExactToolchain,
  buildPass4816ObservabilityReceipt,
  parseConfigArgument,
  readPass4816BuildConfig,
} from "./tooling";

export async function main(argv = process.argv.slice(2)): Promise<void> {
  assertPass4816ExactToolchain();
  const configPath = parseConfigArgument(argv);
  const config = await readPass4816BuildConfig(configPath);
  const result = await buildPass4816ObservabilityReceipt(config);
  process.stdout.write(`${JSON.stringify({
    status: "PASS",
    liveCredit: false,
    receiptDigest: result.receipt.observabilityReceiptDigest,
    observabilitySequence: result.receipt.observabilitySequence,
    objectiveCount: result.receipt.objectiveCount,
    outputDirectory: result.outputDirectory,
  })}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (invokedPath === import.meta.url) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "pass4816_builder_failed"}\n`);
    process.exitCode = 1;
  });
}
