#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { verifyCurrentAuthority, verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";
const REV = "VELMERE_PASS36_A89R0_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_AND_TRUST_CENTER_INTAKE";
const PARENT = "VELMERE_PASS36_A88R1_SEMANTIC_GENERALIZATION_ROUTE_EXECUTION_PRIVACY_AND_PDF_EVIDENCE_RETENTION";
const readJson = (path: string) => JSON.parse(fs.readFileSync(path, "utf8"));
const sha256 = (value: Buffer | string) => crypto.createHash("sha256").update(value).digest("hex");
const policy = readJson("config/pass36/a89-account-auth-tenant-privacy-policy.json");
const receipt = readJson("config/pass36/a89-test-receipt.json");
const state = readJson("config/pass36/a89-current-state.json");
const program = readJson("config/pass36/a89-world-class-completion-program.json");
const trust = readJson("config/pass36/a89-public-trust-intake-index.json");
const authorityResult = verifyCurrentAuthority(process.cwd());
const currentRevisionId = authorityResult.current.sourceRevisionId;
const historicalChain = verifyHistoricalDescendantChain(process.cwd(), "config/pass36/a89-current-root-descendant-manifest.json", currentRevisionId);
const descendant = readJson("config/pass36/a89-current-root-descendant-manifest.json");
const approvedChangeLedgers = [
  readJson("config/pass36/a102r4-approved-auth-boundary-changes.json"),
  readJson("config/pass36/a102r5-approved-paid-access-boundary-changes.json"),
  readJson("config/pass36/a102r11-approved-client-pdf-blob-changes.json"),
  readJson("config/pass36/a102r16-approved-cookie-consent-granular-expiry-changes.json"),
];
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const add = (id: string, passed: unknown, detail: unknown = null) => checks.push({ id, passed: Boolean(passed), detail });
add("revision", [policy.revisionId, receipt.revisionId, state.revisionId, program.revisionId, trust.revisionId, descendant.revisionId].every((value) => value === REV), { policy: policy.revisionId, receipt: receipt.revisionId, state: state.revisionId, program: program.revisionId, descendant: descendant.revisionId });
add("parent", policy.parentRevisionId === PARENT && receipt.parentRevisionId === PARENT && state.parentRevisionId === PARENT && program.parentRevisionId === PARENT && descendant.parentRevisionId === PARENT, PARENT);
add("receipt:pass", receipt.status === "PASS_A89_LOCAL_ACCOUNT_AUTH_TENANT_PRIVACY_RED_TEAM_NO_PROMOTION" && receipt.summary?.checks === 54 && receipt.summary?.failed === 0, receipt.summary);
add("receipt:matrix", receipt.redTeamMatrix?.families === 16 && receipt.redTeamMatrix?.cases === 192 && receipt.redTeamMatrix?.mismatches === 0, receipt.redTeamMatrix);
add("receipt:mutations", receipt.strictEnvelopeMutationCampaign?.generated === 768 && receipt.strictEnvelopeMutationCampaign?.killed === 768 && receipt.strictEnvelopeMutationCampaign?.survived === 0, receipt.strictEnvelopeMutationCampaign);
add("policy:gaps", policy.closedByA89?.length === 28 && new Set((policy.closedByA89 as Array<{ id?: string }>).map((row) => row.id)).size === 28, policy.closedByA89?.length);
for (const [name, input] of Object.entries(policy.inputs as Record<string, { path: string; byteLength: number; sha256: string }>)) {
  const exists = fs.existsSync(input.path);
  const currentByteLength = exists ? fs.statSync(input.path).size : null;
  const currentSha256 = exists ? sha256(fs.readFileSync(input.path)) : null;
  const frozenMatch = currentByteLength === input.byteLength && currentSha256 === input.sha256;
  const validatedChainRevisions = new Set(historicalChain.rows.map((row) => row.revisionId));
  const approvedMatch = approvedChangeLedgers.flatMap((ledger) => {
    const rows = Array.isArray(ledger.entries)
      ? ledger.entries
      : Array.isArray(ledger.approvedChanges)
        ? ledger.approvedChanges
        : [];
    return (rows as Array<Record<string, unknown>>).map((entry) => ({ ledger, entry }));
  }).find(({ ledger, entry }) => {
    const historicalPassPreserved = ledger.claims?.a89HistoricalPassRewritten === false
      || ledger.claims?.parentHistoricalPassRewritten === false;
    const historicalBytesPreserved = entry.historicalBytesRewritten === false
      || entry.parentBytesRewritten === false;
    return entry.path === input.path
      && validatedChainRevisions.has(ledger.revisionId)
      && historicalPassPreserved
      && ledger.claims?.liveProven === false
      && ledger.claims?.saleEnabled === false
      && entry.historicalByteLength === input.byteLength
      && entry.historicalSha256 === input.sha256
      && entry.currentByteLength === currentByteLength
      && entry.currentSha256 === currentSha256
      && historicalBytesPreserved
      && typeof entry.requiredLocalTest === "string"
      && entry.requiredLocalTest.startsWith("PASS_A102R");
  });
  const approvedCurrentDescendant = Boolean(approvedMatch);
  add(`input:${name}`, exists && (frozenMatch || approvedCurrentDescendant), {
    ...input,
    currentByteLength,
    currentSha256,
    frozenMatch,
    approvedCurrentDescendant,
    approvedByRevisionId: approvedMatch?.ledger?.revisionId ?? null,
  });
}
add("state:no-promotion", state.decision === "NO_GO" && state.paidGateEligible === false && state.liveProven === false && state.saleEnabled === false && state.worldClassProven === false, state);
add("state:real-zero", state.realOAuthRuns === 0 && state.realTwoTenantRlsChecksPassed === 0 && state.realAccountTakeoverDrills === 0 && state.realCrossDeviceRevocationDrills === 0 && state.realDsarRuns === 0 && state.externalTrustIntakeRecordsVerified === 0 && state.legalRegulatoryDecisionsSigned === 0, state);
add("program:horizon", program.programRange?.completedThrough === 89 && program.programRange?.remainingAfterA89 === 27 && program.programRange?.remainingPasses === 27 && program.programRange?.lastPlannedPass === 116, program.programRange);
const a89 = (program.passes as Array<{ passNumber?: number; status?: string; mayEnableLiveOrSale?: boolean }> | undefined)?.find((row) => row.passNumber === 89);
add("program:a89", a89?.status === "DONE_LOCAL_RED_TEAM_BLOCKED_REAL_STAGING" && a89?.mayEnableLiveOrSale === false, a89);
add("program:living-roadmap", program.programRules?.roadmapIsLivingContract === true && program.programRules?.newGapMustBeAddedImmediately === true && program.programRules?.noGapMayBeHiddenToPreservePercentage === true, program.programRules);
add("trust:denominator", trust.requiredPublicSections?.length === 20 && trust.currentEvidence?.publicSectionsImplemented === 0 && trust.currentEvidence?.projectsCompleted === 0 && trust.currentEvidence?.externallyAcceptedMediumOrHigh === 0, trust.currentEvidence);
add("trust:no-fake-cert", trust.claimBoundary?.mayClaimAccreditedCertification === false && trust.claimBoundary?.mayClaimEthereumCertifiedAuditor === false && trust.claimBoundary?.publicCrossAuditSuperiorityClaimAllowed === false, trust.claimBoundary);
for (const row of authorityResult.checks) add(`authority:${row.id}`, row.passed, row.detail);
for (const row of historicalChain.checks) add(`historical:${row.id}`, row.passed, row.detail);
add("authority:historical-plane-not-current-required", currentRevisionId !== REV || fs.readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim() === REV, { historicalRevision: REV, currentRevisionId });
const roadmap = fs.readFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt", "utf8");
add("roadmap:history-retained", roadmap.includes("PASS36 A89R0") && roadmap.includes("27 base passes remain") && roadmap.includes("HISTORYCZNA ROADMAPA A88R1"), roadmap.slice(0, 260));
add("production:legacy-header-not-accepted", !fs.readFileSync("lib/auth/account-session.ts", "utf8").includes("VELMERE_TRUSTED_ACCOUNT_HEADER_SECRET") && fs.readFileSync("lib/security/trusted-account-header-boundary.ts", "utf8").includes("legacyStaticBearerAccepted: false"), null);
add("production:durable-recovery", fs.readFileSync("lib/auth/supabase-auth-flow.ts", "utf8").includes("await consumePasswordRecoveryGrant") && fs.readFileSync("app/api/auth/callback/route.ts", "utf8").includes("await issuePasswordRecoveryGrantCookie"), null);
add("production:callback-contract", fs.readFileSync("lib/auth/supabase-auth-flow.ts", "utf8").includes("validateSupabaseAuthCallbackContract") && fs.readFileSync("lib/security/auth-callback-contract.ts", "utf8").includes("callback_otp_type_mismatch"), null);
add("production:strict-boundaries", ["app/api/auth/session/route.ts", "app/api/auth/oauth/google/route.ts", "app/api/auth/recovery/route.ts", "app/api/auth/email-change/route.ts", "app/api/profile/route.ts", "lib/server/lazy-route-modules/account--audit-messages.ts", "lib/server/lazy-route-modules/account--customer-artifact.ts"].every((path) => fs.readFileSync(path, "utf8").includes("validateExact")), null);
const failed = checks.filter((row) => !row.passed);
const output = { schemaVersion: "velmere.pass36.a89.account-auth-tenant-privacy-verifier.v1", revisionId: REV, status: failed.length ? "FAIL_A89_VERIFIER" : "PASS_A89_VERIFIER_NO_PROMOTION", checks: checks.length, passed: checks.length - failed.length, failed: failed.length, failures: failed, liveProven: false, saleEnabled: false, truthBoundary: policy.truthBoundary };
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);
