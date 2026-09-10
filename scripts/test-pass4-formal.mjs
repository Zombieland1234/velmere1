import { FormalVerificationEngine } from "../lib/security/formal/formal-engine.ts";

console.log("=== TESTING PASS 4: FORMAL INVARIANTS & FUZZING ENGINE ===");

// 1. Basic tier test
const basicReport = FormalVerificationEngine.evaluate("AUD-TEST-BASIC", "basic");
console.log("Basic Tier Evaluation:");
console.log("- Invariants count:", basicReport.invariants.length);
console.log("- Stateful Fuzzing Status:", basicReport.statefulFuzzing.status);
console.log("- 'All invariants proven' claim valid?", basicReport.summary.allInvariantsProvenClaimValid);

if (basicReport.summary.allInvariantsProvenClaimValid !== false) {
  throw new Error("Basic tier must not validate 'All invariants proven'!");
}

// 2. Advanced tier with solver run
const advReport = FormalVerificationEngine.evaluate("AUD-TEST-ADV", "advanced", "vault", {
  runSolver: true,
  fuzzRuns: 1000,
});

console.log("\nAdvanced Tier Evaluation (with Solver & Fuzzing):");
console.log("- Invariants count:", advReport.invariants.length);
console.log("- Proven:", advReport.summary.proven);
console.log("- Unknown:", advReport.summary.unknown);
console.log("- Stateful Fuzzing Runs:", advReport.statefulFuzzing.runsExecuted, "Status:", advReport.statefulFuzzing.status);
console.log("- 'All invariants proven' claim valid?", advReport.summary.allInvariantsProvenClaimValid);

for (const inv of advReport.invariants) {
  console.log(`  [${inv.status}] ${inv.id}: ${inv.property}`);
  console.log(`    SMT: ${inv.expression} (Tool: ${inv.tool} v${inv.version})`);
}

// Since 1 invariant was UNKNOWN, the universal claim "All invariants proven" MUST BE FALSE!
if (advReport.summary.allInvariantsProvenClaimValid !== false) {
  throw new Error("Cannot validate 'All invariants proven' when UNKNOWN invariant exists!");
}

if (advReport.statefulFuzzing.runsExecuted !== 1000) {
  throw new Error("Expected 1000 fuzz runs executed!");
}

console.log("\nPASS 4 VERIFICATION SUCCESSFUL!");
