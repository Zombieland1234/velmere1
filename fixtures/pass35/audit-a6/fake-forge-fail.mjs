#!/usr/bin/env node
if (process.argv.includes("--version")) {
  process.stdout.write("forge 1.2.3 (fixture-only)\n");
  process.exit(0);
}
process.stdout.write(JSON.stringify({
  suites: {
    SyntheticTokenTest: {
      tests: {
        testTransferConservesSupply: { status: "Failure", gas: 42110, durationMs: 2, reason: "synthetic invariant failure" }
      }
    }
  }
}));
