#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("--version")) {
  process.stdout.write("1.129.0\n");
  process.exit(0);
}
if (!args.includes("--json") || !args.includes("--config")) process.exit(2);
process.stdout.write(JSON.stringify({
  version: "1.129.0",
  results: [
    {
      check_id: "velmere.solidity.tx-origin-auth",
      path: "fixtures/pass35/audit-a5/SyntheticA5.sol",
      start: { line: 6, col: 9 },
      end: { line: 6, col: 38 },
      extra: { message: "tx.origin should not authorize privileged actions", severity: "ERROR", metadata: { category: "security", confidence: "HIGH" } }
    },
    {
      check_id: "velmere.solidity.delegatecall-review",
      path: "fixtures/pass35/audit-a5/SyntheticA5.sol",
      start: { line: 10, col: 9 },
      end: { line: 10, col: 47 },
      extra: { message: "delegatecall target requires manual trust-boundary review", severity: "WARNING", metadata: { category: "security", confidence: "MEDIUM" } }
    }
  ],
  errors: []
}));
