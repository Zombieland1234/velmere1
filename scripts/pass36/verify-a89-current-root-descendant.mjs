#!/usr/bin/env node
import { digestValid, readJson, verifyCurrentAuthority, verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";

const root = process.cwd();
const REVISION_ID = "VELMERE_PASS36_A89R0_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_AND_TRUST_CENTER_INTAKE";
const MANIFEST_PATH = "config/pass36/a89-current-root-descendant-manifest.json";
const policy = readJson(root, "config/pass36/a89-account-auth-tenant-privacy-policy.json");
const parent = readJson(root, policy.parentDescendantManifestPath);
const manifest = readJson(root, MANIFEST_PATH);
const receipt = readJson(root, "config/pass36/a89-test-receipt.json");
const authority = verifyCurrentAuthority(root);
const currentRevisionId = authority.current.sourceRevisionId;
const chain = verifyHistoricalDescendantChain(root, MANIFEST_PATH, currentRevisionId);
const checks = [];
const add = (id, passed, detail = null) => checks.push({ id, passed: Boolean(passed), detail });

add("parent:digest", digestValid(parent), parent.manifestDigestSha256);
add("parent:revision", parent.revisionId === policy.parentRevisionId, parent.revisionId);
add("manifest:digest", digestValid(manifest), manifest.manifestDigestSha256);
add("manifest:revision", manifest.revisionId === REVISION_ID, manifest.revisionId);
add("manifest:parent", manifest.parentRevisionId === policy.parentRevisionId && manifest.parentDescendantManifestDigestSha256 === parent.manifestDigestSha256, {
  parentRevisionId: manifest.parentRevisionId,
  parentDigest: manifest.parentDescendantManifestDigestSha256,
});
add("manifest:frozen-payload-present", Number.isInteger(manifest.payload?.fileCount) && manifest.payload.fileCount > 0 && Number.isInteger(manifest.payload?.byteLength) && manifest.payload.byteLength > 0 && /^[a-f0-9]{64}$/u.test(manifest.payload?.pathSetSha256 ?? "") && /^[a-f0-9]{64}$/u.test(manifest.payload?.aggregateSha256 ?? ""), manifest.payload);
add("receipt:pass", receipt.status === "PASS_A89_LOCAL_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_NO_PROMOTION" && receipt.summary?.failed === 0, receipt.status);
add("claims:denominators", manifest.claims?.redTeamFamilies === 16 && manifest.claims?.redTeamCases === 192 && manifest.claims?.redTeamMismatches === 0 && manifest.claims?.strictEnvelopeMutations === 768 && manifest.claims?.strictEnvelopeMutationsKilled === 768 && manifest.claims?.closedGaps === 28, manifest.claims);
add("claims:no-credit", manifest.claims?.realOAuthRuns === 0 && manifest.claims?.realTwoTenantRlsChecks === 0 && manifest.claims?.realAccountTakeoverDrills === 0 && manifest.claims?.realCrossDeviceRevocationDrills === 0 && manifest.claims?.realDsarRuns === 0 && manifest.claims?.externalTrustIntakeRecordsVerified === 0 && manifest.claims?.legalRegulatoryDecisionsSigned === 0 && manifest.claims?.exactA80CandidateBound === false && manifest.claims?.paidGateEligible === false && manifest.claims?.liveProven === false && manifest.claims?.saleEnabled === false && manifest.claims?.worldClassProven === false, manifest.claims);
for (const row of authority.checks) add(`authority:${row.id}`, row.passed, row.detail);
for (const row of chain.checks) add(`historical:${row.id}`, row.passed, row.detail);
add("historical:frozen-plane-not-recomputed", chain.start?.revisionId === REVISION_ID && chain.start?.payload?.aggregateSha256 === manifest.payload?.aggregateSha256, {
  historicalRevisionId: chain.start?.revisionId,
  frozenPayload: chain.start?.payload,
});
add("historical:current-authority-reached", chain.current?.revisionId === currentRevisionId && chain.ok, {
  expected: currentRevisionId,
  observed: chain.current?.revisionId,
  rows: chain.rows.length,
});

const failed = checks.filter((row) => !row.passed);
const output = {
  schemaVersion: "velmere.pass36.a89.current-root-descendant-verification.v2",
  revisionId: REVISION_ID,
  currentRevisionId,
  status: failed.length ? "FAIL_A89_DESCENDANT" : "PASS_A89_DESCENDANT_NO_PROMOTION",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  historicalPayload: manifest.payload,
  descendantRows: chain.rows,
  claims: manifest.claims,
  truthBoundary: "The A89 payload remains frozen and is never recomputed against later source bytes. This verifier proves the exact manifest chain from A89 to the current authority and does not grant real OAuth, RLS, legal, LIVE or sale credit.",
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
