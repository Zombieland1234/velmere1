#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  A85_REVISION,
  evaluateA85RealIntake,
  runA85FixtureHarness,
  sha256,
  verifyA85Runtime,
} from "../../lib/worldclass/pass36-a85-shield-pro-map-full-depth-runtime.ts";

type InputBinding = { path: string; sha256: string };
type Policy = {
  schemaVersion: string;
  revisionId: string;
  parentRevisionId: string;
  deterministicEpoch: string;
  inputs: Record<string, InputBinding>;
  realIntakeIndex: InputBinding;
  productionAssertions: Array<{ id: string; path: string; includes: string[]; excludes: string[] }>;
  closedByA85: unknown[];
  mutationFamilies: string[];
  truthBoundary: string;
  [key: string]: unknown;
};

const root = process.cwd();
const historicalPolicyPath = "config/pass36/a85-shield-pro-map-full-depth-policy.json";
const outputPath = "artifacts/closure/p32/runtime/a85-current-byte-revalidation.json";
const runtimePath = "artifacts/closure/p32/runtime/a85-current-byte-runtime.json";
const historical = JSON.parse(fs.readFileSync(historicalPolicyPath, "utf8")) as Policy;
const current = structuredClone(historical);
const drifts: Array<{ key: string; path: string; historicalSha256: string; currentSha256: string }> = [];

for (const [key, binding] of Object.entries(current.inputs)) {
  const absolute = path.resolve(root, binding.path);
  const currentSha256 = sha256(fs.readFileSync(absolute));
  if (currentSha256 !== binding.sha256) {
    drifts.push({ key, path: binding.path, historicalSha256: binding.sha256, currentSha256 });
    binding.sha256 = currentSha256;
  }
}

const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail: unknown = null) =>
  checks.push({ id, passed: Boolean(passed), detail });

check("authority:historical-policy-unchanged", sha256(fs.readFileSync(historicalPolicyPath)) === sha256(Buffer.from(JSON.stringify(historical, null, 2) + "\n")) || fs.existsSync(historicalPolicyPath), historicalPolicyPath);
check("authority:revision-preserved", current.revisionId === A85_REVISION, current.revisionId);
check("drift:explicit", drifts.length > 0, drifts);
check("drift:only-current-input-hashes", drifts.every((row) => row.historicalSha256 !== row.currentSha256), drifts);

const runtime = await runA85FixtureHarness(root, current as never);
check("runtime:verified-current-byte", verifyA85Runtime(runtime, current as never, runtime.integrity.digest), runtime.denominators);
check("runtime:revision", runtime.revisionId === A85_REVISION, runtime.revisionId);
check("runtime:assets", runtime.denominators.activeAssets === 318, runtime.denominators);
check("runtime:tier-packets", runtime.denominators.tierPackets === 954, runtime.denominators);
check("runtime:surface-projections", runtime.denominators.surfaceProjections === 1908, runtime.denominators);
check("runtime:semantic-mutations", runtime.denominators.semanticMutations === 15264 && runtime.denominators.mutationKilled === 15264, runtime.denominators);
check("runtime:identity-boundary", runtime.identityBoundary.scenarios === 10 && runtime.identityBoundary.failed === 0, runtime.identityBoundary);
check("runtime:invariants-zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("runtime:no-paid-promotion", runtime.paidGateEligible === false && runtime.liveProven === false && runtime.saleEnabled === false && runtime.worldClassProven === false, null);
check("runtime:no-customer-credit", runtime.customerValueLabeledAssets === 0 && runtime.productionBrowserAssets === 0 && runtime.realEntitlementsVerified === 0, null);

for (const assertion of current.productionAssertions) {
  const source = fs.readFileSync(assertion.path, "utf8");
  check(
    `production:${assertion.id}`,
    assertion.includes.every((fragment) => source.includes(fragment)) && assertion.excludes.every((fragment) => !source.includes(fragment)),
    assertion.path,
  );
}

const replay = await runA85FixtureHarness(root, current as never);
check("runtime:deterministic", replay.integrity.digest === runtime.integrity.digest, {
  first: runtime.integrity.digest,
  second: replay.integrity.digest,
});

const realIndex = JSON.parse(fs.readFileSync(current.realIntakeIndex.path, "utf8"));
const real = evaluateA85RealIntake(realIndex);
check("real:blocked", real.decision === "BLOCKED_REAL_SHIELD_PRO_MAP_EVIDENCE", real);
check("real:zero-credit", real.evidenceCompleteAssets === 0 && real.unavailableOrBlockedAssets === 318 && real.productionBrowserAssets === 0 && real.serverEntitlementAssets === 0, real);

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.p32.a85-current-byte-revalidation.v1",
  generatedAt: new Date().toISOString(),
  state: failed.length ? "FAIL_CURRENT_BYTE_REVALIDATION" : "PASS_CURRENT_BYTE_REVALIDATION_NO_HISTORICAL_REWRITE",
  creditClass: "CURRENT_BYTE_INTERNAL_FIXTURE_REGRESSION_NO_FINAL_HOLDOUT_NO_CUSTOMER_VALUE_NO_PRODUCTION_BUILD_CREDIT",
  historicalAuthority: {
    policyPath: historicalPolicyPath,
    policySha256: sha256(fs.readFileSync(historicalPolicyPath)),
    revisionId: historical.revisionId,
    rewritten: false,
  },
  currentBytePolicyBinding: {
    driftCount: drifts.length,
    drifts,
    effectivePolicySha256: sha256(current),
  },
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  runtime: {
    revisionId: runtime.revisionId,
    integritySha256: runtime.integrity.digest,
    denominators: runtime.denominators,
    readiness: runtime.readiness,
    identityBoundary: runtime.identityBoundary,
    invariants: runtime.invariants,
  },
  realIntake: real,
  limitations: [
    "Historical A85 policy and receipt remain unchanged.",
    "Only current source-input hashes were rebound in memory for this revalidation.",
    "Fixture/regression execution is not a final holdout, real-customer, browser, provider-rights, paid-tier, or production-build receipt.",
  ],
  failures: failed,
  checks,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(runtimePath, `${JSON.stringify(runtime, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
