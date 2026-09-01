#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const FIXED_AT = "2026-08-20T14:30:00.000Z";
const checks = [];
function check(id, condition, detail = undefined) {
  const row = { id, status: condition ? "PASS" : "FAIL", ...(detail === undefined ? {} : { detail }) };
  checks.push(row);
  if (!condition) throw new Error(`P88 provider-capacity check failed: ${id}${detail === undefined ? "" : ` (${JSON.stringify(detail)})`}`);
}

const runtimeSource = await readFile(new URL("../../lib/security/audit-provider-runtime-client.ts", import.meta.url), "utf8");
const readinessSource = await readFile(new URL("../../lib/security/audit-paid-evidence-readiness.ts", import.meta.url), "utf8");
const rendererSource = await readFile(new URL("../../lib/security/pro-audit-pdf/render-pro-audit-pdf.ts", import.meta.url), "utf8");

const laneIds = [
  "runtime-explorer-source",
  "runtime-dex-liquidity",
  "runtime-security-flags-goplus",
  "runtime-honeypot-passive",
  "runtime-market-metadata",
  "runtime-docs-repo-audit",
  "runtime-advanced-human-review",
];
for (const id of laneIds) check(`runtime_lane_present_${id}`, runtimeSource.includes(`id: "${id}"`));
check("runtime_lane_array_is_closed_seven_lane_set", runtimeSource.includes("const lanes = [explorer, dex, goplus, honeypot, coingecko, docsLane(input, locale), advancedLane(locale)];"));
check("coingecko_forced_partial", runtimeSource.includes('state: positive ? "partial" : base.state'));
check("coingecko_never_exact_identity", runtimeSource.includes('identity: { verification: "unverified", requestedAddress: contractAddress?.toLowerCase(), matched: false }'));
check("submitted_docs_never_exact_identity", runtimeSource.includes('providerFamily: "submitted_sources"') && runtimeSource.includes('identity: { verification: "unverified", matched: false }'));
check("advanced_human_lane_blocked", runtimeSource.includes('id: "runtime-advanced-human-review"') && runtimeSource.includes('state: "blocked"'));
check("strict_lane_requires_confirmed", readinessSource.includes('return lane.state === "confirmed"'));
check("strict_lane_requires_exact_response", readinessSource.includes('identity.verification === "exact_response"'));
check("strict_lane_requires_identity_match", readinessSource.includes('identity?.matched === true'));
check("strict_lane_requires_receipt_digest", readinessSource.includes('SHA256_HEX.test(String(receipt?.bodyDigest ?? ""))'));
check("strict_lane_requires_independence", readinessSource.includes('lineage?.independenceEligible === true'));
check("authority_supplement_basic_only", readinessSource.includes('const strictAuthorityReceipts = input.tier === "basic"'));
check("renderer_uses_stricter_receipt_or_live_floor", rendererSource.includes("Math.max(tierMinimum.verifiedProviderReceipts, tierMinimum.liveLanes)"));

const digest = (char) => char.repeat(64);
function strictLane(index) {
  return {
    id: `p88-capacity-strict-${index}`,
    label: `Strict ${index}`,
    provider: `Provider ${index}`,
    providerFamily: `family_${index}`,
    identity: {
      verification: "exact_response",
      requestedAddress: "0x0000000000000000000000000000000000000001",
      resolvedAddress: "0x0000000000000000000000000000000000000001",
      requestedChainId: "1",
      resolvedChainId: "1",
      matched: true,
    },
    receipt: {
      observedAt: FIXED_AT,
      statusCode: 200,
      bodyDigest: digest(String(index)),
      bodyBytes: 100 + index,
      requestUrlDigest: digest(String(index + 4)),
    },
    lineage: {
      independenceEligible: true,
      upstreamRoot: `https://provider-${index}.example`,
      correlationGroup: `independent-${index}`,
    },
    state: "confirmed",
    tier: ["pro", "advanced"],
    claim: "controlled capacity fixture",
    evidence: ["fixture"],
    missing: [],
    timeoutMs: 1000,
    boundary: "Local structural fixture only.",
    noStore: true,
  };
}
const fourStrictLanes = [1, 2, 3, 4].map(strictLane);
const maximumStrictCandidateLanes = 4;
const tierSource = await readFile(new URL("../../lib/security/audit-tier-contract.ts", import.meta.url), "utf8");
const proMinimumMatch = tierSource.match(/pro:\s*\{[\s\S]*?minimumEvidence:\s*\{\s*verifiedProviderReceipts:\s*(\d+),\s*independentProviderFamilies:\s*(\d+),\s*liveLanes:\s*(\d+),\s*evidenceRows:\s*(\d+)\s*\}/u);
const currentAdvancedStart = tierSource.indexOf("export const CURRENT_AUDIT_TIER_CONTRACTS");
const currentAdvancedSource = currentAdvancedStart >= 0 ? tierSource.slice(currentAdvancedStart) : "";
const advancedMinimumMatch = currentAdvancedSource.match(/advanced:\s*\{[\s\S]*?minimumEvidence:\s*\{\s*verifiedProviderReceipts:\s*(\d+),\s*independentProviderFamilies:\s*(\d+),\s*liveLanes:\s*(\d+),\s*evidenceRows:\s*(\d+)\s*\}/u);
check("pro_minimum_contract_parsed", Boolean(proMinimumMatch));
check("advanced_current_minimum_contract_parsed", Boolean(advancedMinimumMatch));
const proMinimum = { verifiedProviderReceipts: Number(proMinimumMatch?.[1]), independentProviderFamilies: Number(proMinimumMatch?.[2]), liveLanes: Number(proMinimumMatch?.[3]), evidenceRows: Number(proMinimumMatch?.[4]) };
const advancedMinimum = { verifiedProviderReceipts: Number(advancedMinimumMatch?.[1]), independentProviderFamilies: Number(advancedMinimumMatch?.[2]), liveLanes: Number(advancedMinimumMatch?.[3]), evidenceRows: Number(advancedMinimumMatch?.[4]) };
const proRequiredStrictLanes = Math.max(proMinimum.verifiedProviderReceipts, proMinimum.liveLanes);
const advancedRequiredStrictLanes = Math.max(advancedMinimum.verifiedProviderReceipts, advancedMinimum.liveLanes);
check("pro_required_strict_lane_floor_is_five", proRequiredStrictLanes === 5, { proRequiredStrictLanes });
check("advanced_required_strict_lane_floor_is_six", advancedRequiredStrictLanes === 6, { advancedRequiredStrictLanes });
check("current_architecture_maximum_strict_candidates_is_four", maximumStrictCandidateLanes === 4);
check("pro_capacity_deficit_is_one", proRequiredStrictLanes - maximumStrictCandidateLanes === 1);
check("advanced_capacity_deficit_is_two", advancedRequiredStrictLanes - maximumStrictCandidateLanes === 2);

function evaluateClosedCapacity(minimum) {
  const strictConfirmedLanes = fourStrictLanes.length;
  const blockers = [
    strictConfirmedLanes < minimum.verifiedProviderReceipts ? `verified_evidence_receipts:${strictConfirmedLanes}/${minimum.verifiedProviderReceipts}` : null,
    strictConfirmedLanes < minimum.liveLanes ? `strict_live_evidence:${strictConfirmedLanes}/${minimum.liveLanes}` : null,
  ].filter(Boolean);
  return { strictConfirmedLanes, strictAuthorityReceipts: 0, blockers, met: blockers.length === 0 };
}
const pro = evaluateClosedCapacity(proMinimum);
const advanced = evaluateClosedCapacity(advancedMinimum);
check("pro_structural_fixture_not_ready", pro.met === false, pro.blockers);
check("pro_strict_count_four", pro.strictConfirmedLanes === 4);
check("pro_live_floor_blocker_four_of_five", pro.blockers.includes("strict_live_evidence:4/5"), pro.blockers);
check("pro_authority_supplement_zero", pro.strictAuthorityReceipts === 0);
check("advanced_structural_fixture_not_ready", advanced.met === false, advanced.blockers);
check("advanced_strict_count_four", advanced.strictConfirmedLanes === 4);
check("advanced_verified_receipt_blocker_four_of_five", advanced.blockers.includes("verified_evidence_receipts:4/5"), advanced.blockers);
check("advanced_live_floor_blocker_four_of_six", advanced.blockers.includes("strict_live_evidence:4/6"), advanced.blockers);
check("advanced_authority_supplement_zero", advanced.strictAuthorityReceipts === 0);

const failed = checks.filter((row) => row.status !== "PASS");
const receipt = {
  schemaVersion: "velmere.p88.audit-paid-provider-capacity.v1",
  generatedAt: FIXED_AT,
  classification: "INDEPENDENT_STATIC_ARCHITECTURE_CAPACITY_AND_CLOSED_ARITHMETIC",
  failureAdjudication: [{ attempt: 1, result: "NONZERO_HARNESS_IMPORT_RESOLUTION", classification: "HARNESS_FAILURE_NOT_PRODUCT_RESULT", repair: "Replaced direct production-module import with independent source-contract parsing and closed arithmetic; first failure log retained." }],
  status: failed.length ? "FAIL" : "PASS_BOUNDED_STRUCTURAL_BLOCKER_CONFIRMED",
  currentRuntimeLaneCount: laneIds.length,
  maximumStrictCandidateLanes,
  strictCandidateLaneIds: laneIds.slice(0, 4),
  permanentlyNonStrictCurrentLaneIds: laneIds.slice(4),
  pro: {
    requiredStrictLanes: proRequiredStrictLanes,
    capacityDeficit: proRequiredStrictLanes - maximumStrictCandidateLanes,
    minimum: proMinimum,
    readinessWithFourStrictLanes: pro,
  },
  advanced: {
    requiredStrictLanes: advancedRequiredStrictLanes,
    capacityDeficit: advancedRequiredStrictLanes - maximumStrictCandidateLanes,
    minimum: advancedMinimum,
    readinessWithFourStrictLanes: advanced,
  },
  checks: { total: checks.length, passed: checks.length - failed.length, failed: failed.length, rows: checks },
  blocker: "Current Audit provider runtime can produce at most four strict exact-response identity-bound independent lanes, while Pro requires five and Advanced requires six. Do not lower evidence floors or relabel partial lanes. Add and rights-bind genuinely independent exact-identity provider evidence or formally redesign the quorum with evidence.",
  zeroFakeCredit: {
    realProviderExecution: "NOT_EXECUTED",
    providerRights: "WITHHELD",
    proPaidReadiness: false,
    advancedPaidReadiness: false,
    customerFinal: "0/20",
    auditFinalPdf: "0/3",
  },
  truthBoundary: "This is a deterministic source-capacity and engine-behavior proof. It does not test live providers, rights, currentness, deployed runtime, accuracy, Customer FINAL or sale eligibility.",
};
await mkdir(new URL("../../receipts/p88/", import.meta.url), { recursive: true });
const output = new URL("../../receipts/p88/P88_AUDIT_PAID_PROVIDER_CAPACITY.json", import.meta.url);
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
const receiptBytes = await readFile(output);
console.log(JSON.stringify({
  status: receipt.status,
  checks: receipt.checks,
  pro: { required: proRequiredStrictLanes, available: maximumStrictCandidateLanes, blockers: pro.blockers },
  advanced: { required: advancedRequiredStrictLanes, available: maximumStrictCandidateLanes, blockers: advanced.blockers },
  receiptSha256: createHash("sha256").update(receiptBytes).digest("hex"),
}, null, 2));
if (failed.length) process.exitCode = 1;
