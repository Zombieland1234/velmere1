#!/usr/bin/env node
import { existsSync } from "node:fs";

if (process.argv.includes("--version")) {
  process.stdout.write("forge 1.2.3 (fixture-only)\n");
  process.exit(0);
}
const testIndex = process.argv.indexOf("test");
const rootIndex = process.argv.indexOf("--root");
const projectRoot = rootIndex >= 0 ? process.argv[rootIndex + 1] : null;
if (testIndex < 0 || !projectRoot || !existsSync(projectRoot) || !process.argv.includes("--json")) {
  process.stderr.write("invalid invocation\n");
  process.exit(2);
}
process.stdout.write(JSON.stringify({
  suites: {
    SyntheticTokenTest: {
      tests: {
        testTransferConservesSupply: { status: "Success", gas: 42110, durationMs: 2 },
        testUnauthorizedMintReverts: { status: "Success", gas: 29884, durationMs: 1 },
        testBurnReducesSupply: { status: "Success", gas: 35120, durationMs: 1 },
        testOwnerMintIncreasesSupply: { status: "Success", gas: 38777, durationMs: 1 }
      }
    }
  }
}));
