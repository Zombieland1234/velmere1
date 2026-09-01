#!/usr/bin/env node
const commandId = String(process.argv[2] ?? "");
const allowed = new Set(["A51", "A52", "A63"]);
if (!allowed.has(commandId)) {
  console.error(JSON.stringify({ status: "REJECTED_UNKNOWN_RETIRED_COMMAND", commandId: null }));
  process.exit(2);
}
console.error(JSON.stringify({
  schemaVersion: "velmere.pass36.retired-staging-command-block.v1",
  status: "BLOCKED_UNSAFE_LEGACY_STAGING_COMMAND",
  commandId,
  mutationStarted: false,
  networkCalls: 0,
  actionRequired: "Use the current frozen-source A95-A104 admission and signed external staging program after exact release closure.",
  truthBoundary: "The legacy real staging command is fail-closed. Fixture-only tests remain available and grant no staging credit.",
}));
process.exit(2);
