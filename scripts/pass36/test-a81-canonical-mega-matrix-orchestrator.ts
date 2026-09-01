#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  A81_REVISION,
  runA81CanonicalMegaMatrix,
  verifyA81CanonicalMegaMatrix,
} from "../../lib/worldclass/pass36-a81-canonical-mega-matrix-runtime.ts";

const policy = JSON.parse(readFileSync("config/pass36/a81-canonical-mega-matrix-orchestrator.json", "utf8"));
const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};
const sha256 = (value: unknown): string => createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
const runtime = runA81CanonicalMegaMatrix(process.cwd(), policy);
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail?: unknown) => checks.push({ id, passed: Boolean(passed), detail });

check("runtime:verified", verifyA81CanonicalMegaMatrix(runtime, policy, runtime.integrity.digest), runtime.integrity);
check("runtime:revision", runtime.revisionId === A81_REVISION, runtime.revisionId);
check("denominator:base", runtime.denominators.uniqueBaseCases === 300, runtime.denominators);
check("denominator:source", runtime.denominators.sourceMatrixRows === 2700 && runtime.denominators.sourceAdapterRows === 2700, runtime.denominators);
check("denominator:module-cases", runtime.denominators.moduleCases === 500, runtime.denominators.moduleCases);
check("denominator:packets", runtime.denominators.packetRows === 4500, runtime.denominators.packetRows);
check("denominator:projections", runtime.denominators.channelProjections === 27000, runtime.denominators.channelProjections);
check("denominator:mutations", runtime.denominators.mutationDenominator === 36000 && runtime.denominators.mutationKilled === 36000, runtime.denominators);
check("coverage:modules", Object.keys(runtime.coverage.modules).length === 10 && Object.values(runtime.coverage.modules).every((row) => row.sourceCases === 50 && row.packetRows === 450 && row.channelProjections === 2700), runtime.coverage.modules);
check("coverage:tiers", Object.values(runtime.coverage.tiers).every((value) => value === 1500), runtime.coverage.tiers);
check("coverage:locales", Object.values(runtime.coverage.locales).every((value) => value === 1500), runtime.coverage.locales);
check("coverage:channels", Object.values(runtime.coverage.channels).every((value) => value === 4500), runtime.coverage.channels);
check("claims:basic", runtime.claimCounts.basic.packets === 1500 && runtime.claimCounts.basic.claimsPerPacket === 8 && runtime.claimCounts.basic.totalClaims === 12000, runtime.claimCounts.basic);
check("claims:pro", runtime.claimCounts.pro.packets === 1500 && runtime.claimCounts.pro.claimsPerPacket === 16 && runtime.claimCounts.pro.totalClaims === 24000, runtime.claimCounts.pro);
check("claims:advanced", runtime.claimCounts.advanced.packets === 1500 && runtime.claimCounts.advanced.claimsPerPacket === 24 && runtime.claimCounts.advanced.totalClaims === 36000, runtime.claimCounts.advanced);
check("invariants:zero", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("rows:unique", runtime.rows.length === 4500 && new Set(runtime.rows.map((row) => row.matrixId)).size === 4500, runtime.rows.length);
check("rows:packet-shape", runtime.rows.every((row) => /^[a-f0-9]{64}$/u.test(row.packetHash) && /^[a-f0-9]{64}$/u.test(row.factsHash) && /^[a-f0-9]{64}$/u.test(row.rowDigestSha256)), null);
check("rows:no-silent-tier", runtime.rows.every((row) => row.matrixId.includes(`::${row.tier}::${row.locale}`)), null);
check("truth:no-provider-credit", runtime.canonicalProviderBoundOutputsExecuted === 0, runtime.canonicalProviderBoundOutputsExecuted);
check("truth:no-render-browser-model", runtime.physicalCustomerPdfOutputsExecuted === 0 && runtime.browserRunsExecuted === 0 && runtime.modelRunsExecuted === 0, null);
check("truth:no-a80-binding", runtime.exactA80CandidateBound === false, runtime.exactA80CandidateBound);
check("truth:no-customer-value", runtime.customerPurchaseWorthinessProven === false, runtime.customerPurchaseWorthinessProven);
check("truth:no-live-sale", runtime.liveProven === false && runtime.saleEnabled === false && runtime.worldClassProven === false, null);

const replay = runA81CanonicalMegaMatrix(process.cwd(), policy);
check("determinism:integrity", replay.integrity.digest === runtime.integrity.digest, { first: runtime.integrity.digest, second: replay.integrity.digest });
check("determinism:rows", replay.rows[0]?.rowDigestSha256 === runtime.rows[0]?.rowDigestSha256 && replay.rows.at(-1)?.rowDigestSha256 === runtime.rows.at(-1)?.rowDigestSha256, null);

const tampered = structuredClone(runtime);
tampered.rows[0].packetHash = "0".repeat(64);
check("tamper:runtime-rejected", verifyA81CanonicalMegaMatrix(tampered, policy) === false, null);
const resealedTampered = structuredClone(runtime);
resealedTampered.rows[0].packetHash = "1".repeat(64);
const { rowDigestSha256: _oldRowDigest, ...rowCore } = resealedTampered.rows[0];
resealedTampered.rows[0].rowDigestSha256 = sha256(rowCore);
const { integrity: _oldIntegrity, ...runtimeCore } = resealedTampered;
resealedTampered.integrity = { algorithm: "sha256", digest: sha256(runtimeCore) };
check("tamper:resealed-runtime-rejected-by-anchored-digest", verifyA81CanonicalMegaMatrix(resealedTampered, policy, runtime.integrity.digest) === false, {
  expected: runtime.integrity.digest,
  resealed: resealedTampered.integrity.digest,
});
const mutatedPolicy = structuredClone(policy);
mutatedPolicy.expectedDenominators.packetRows = 4499;
check("tamper:policy-rejected", verifyA81CanonicalMegaMatrix(runtime, mutatedPolicy) === false, null);

const failed = checks.filter((row) => !row.passed);
const receipt = {
  schemaVersion: "velmere.pass36.a81.canonical-mega-matrix-test-receipt.v1",
  revisionId: A81_REVISION,
  generatedAt: policy.deterministicEpoch,
  status: failed.length ? "FAIL_A81_CANONICAL_MEGA_MATRIX" : "PASS_A81_LOCAL_CANONICAL_MEGA_MATRIX_SYNTHETIC_ONLY",
  summary: { checks: checks.length, passed: checks.length - failed.length, failed: failed.length },
  denominators: runtime.denominators,
  coverage: runtime.coverage,
  claimCounts: runtime.claimCounts,
  invariants: runtime.invariants,
  runtimeIntegritySha256: runtime.integrity.digest,
  canonicalProviderBoundOutputsExecuted: 0,
  physicalCustomerPdfOutputsExecuted: 0,
  browserRunsExecuted: 0,
  modelRunsExecuted: 0,
  exactA80CandidateBound: false,
  customerPurchaseWorthinessProven: false,
  liveProven: false,
  saleEnabled: false,
  worldClassProven: false,
  failures: failed,
  checks,
  truthBoundary: policy.truthBoundary,
};
mkdirSync("artifacts/pass36/a81", { recursive: true });
writeFileSync("config/pass36/a81-test-receipt.json", `${JSON.stringify(receipt, null, 2)}\n`);
writeFileSync("artifacts/pass36/a81/PASS36_A81_CANONICAL_MEGA_MATRIX_RUNTIME.json", `${JSON.stringify(runtime, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify(receipt, null, 2));
if (failed.length) process.exit(1);
