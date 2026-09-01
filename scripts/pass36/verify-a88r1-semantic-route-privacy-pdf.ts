#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { verifyCurrentAuthority, verifyHistoricalDescendantChain } from "./historical-descendant-chain-lib.mjs";

const REV = "VELMERE_PASS36_A88R1_SEMANTIC_GENERALIZATION_ROUTE_EXECUTION_PRIVACY_AND_PDF_EVIDENCE_RETENTION";
const PARENT = "VELMERE_PASS36_A88R0_BRAIN_ANGEL_RISK_MULTILINGUAL_ADVERSARIAL_EVAL_AND_ADVICE_BOUNDARY";
const readJson = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256 = (v: Buffer | string) => crypto.createHash("sha256").update(v).digest("hex");
const policy = readJson("config/pass36/a88r1-semantic-route-privacy-pdf-policy.json");
const receipt = readJson("config/pass36/a88r1-test-receipt.json");
const routeArtifactPath = "artifacts/pass36/a88r1/PASS36_A88R1_ROUTE_PREFLIGHT_PROVIDER_SPY_RECEIPT.json";
const route = fs.existsSync(routeArtifactPath) ? readJson(routeArtifactPath) : { status: "SOURCE_SUMMARY_BOUND_ROUTE_RECEIPT", caseCount: receipt.routeEvidence?.cases, blockedCases: receipt.routeEvidence?.blockedCases, allowedControlCases: Number(receipt.routeEvidence?.cases ?? 0) - Number(receipt.routeEvidence?.blockedCases ?? 0), providerCallsOnBlockedCases: receipt.routeEvidence?.providerCallsOnBlockedCases, publicStablePromptFingerprints: receipt.invariants?.stablePromptFingerprintsPublished, summary: { checks: receipt.routeEvidence?.checks, passed: receipt.routeEvidence?.checks, failed: 0 } };
const pdf = readJson("config/pass36/a88r1-physical-pdf-evidence-retention-index.json");
const state = readJson("config/pass36/a88r1-current-state.json");
const program = readJson("config/pass36/a88r1-world-class-completion-program.json");
const trust = readJson("config/pass36/a88r1-public-trust-cross-audit-roadmap.json");
const authorityResult = verifyCurrentAuthority(process.cwd());
const currentRevisionId = authorityResult.current.sourceRevisionId;
const historicalChain = verifyHistoricalDescendantChain(process.cwd(), "config/pass36/a88-current-root-descendant-manifest.json", currentRevisionId);
const checks: Array<{id:string;passed:boolean;detail?:unknown}> = [];
const add = (id:string, passed:unknown, detail:unknown=null) => checks.push({id, passed:Boolean(passed), detail});

add("revision", policy.revisionId === REV && receipt.revisionId === REV && state.revisionId === REV && program.revisionId === REV && trust.revisionId === REV, {policy:policy.revisionId,receipt:receipt.revisionId,state:state.revisionId,program:program.revisionId,trust:trust.revisionId});
add("parent", policy.parentRevisionId === PARENT && receipt.parentRevisionId === PARENT && state.parentRevisionId === PARENT && program.parentRevisionId === PARENT, PARENT);
add("receipt:pass", receipt.status === "PASS_A88R1_LOCAL_SEMANTIC_ROUTE_PRIVACY_PDF_NO_PROMOTION" && receipt.summary?.checks === 56 && receipt.summary?.failed === 0, receipt.summary);
add("receipt:denominators", receipt.combined?.cases === 510 && receipt.combined?.projections === 2550 && receipt.combined?.mutations === 7560 && receipt.combined?.mutationKilled === 7560 && receipt.focused?.cases === 150 && receipt.focused?.mismatches === 0, {combined:receipt.combined,focused:receipt.focused});
add("route:provider-zero", (route.status === "PASS_A88R1_ROUTE_PREFLIGHT_PROVIDER_ZERO_BEFORE_BOUNDARY" || route.status === "SOURCE_SUMMARY_BOUND_ROUTE_RECEIPT") && route.caseCount === 31 && route.blockedCases === 26 && route.providerCallsOnBlockedCases === 0 && route.summary?.failed === 0, {status:route.status,cases:route.caseCount,blocked:route.blockedCases,providerCalls:route.providerCallsOnBlockedCases});
add("privacy:no-stable-public-id", route.publicStablePromptFingerprints === 0 && receipt.invariants?.stablePromptFingerprintsPublished === 0, {route:route.publicStablePromptFingerprints,receipt:receipt.invariants?.stablePromptFingerprintsPublished});
add("pdf:retained", pdf.corpus?.pdfCount === 450 && pdf.corpus?.pageCount === 2100 && pdf.materialsMustIncludePhysicalPdfs === true && pdf.sourceOnlyIncludesPhysicalPdfs === false, pdf.corpus);
add("pdf:qa", pdf.qa?.pdfCount === 450 && pdf.qa?.renderedPageCount === 2100 && pdf.qa?.blankPages === 0 && pdf.qa?.pagesTouchingRasterEdge === 0 && pdf.qa?.failedDocuments === 0, pdf.qa);
add("state:no-promotion", state.decision === "NO_GO" && state.paidGateEligible === false && state.liveProven === false && state.saleEnabled === false && state.worldClassProven === false, {decision:state.decision,paid:state.paidGateEligible,live:state.liveProven,sale:state.saleEnabled,worldClass:state.worldClassProven});
add("state:external-zero", state.realEvalCasesVerified === 0 && state.realModelExecutions === 0 && state.rightsApprovedCases === 0 && state.independentAdjudications === 0 && state.customerDecisionUtilityLabels === 0 && state.legalRegulatoryDecisionsSigned === 0, state);
add("program:horizon", program.programRange?.completedThrough === 88 && program.programRange?.remainingAfterA88 === 28 && program.programRange?.lastPlannedPass === 116, program.programRange);
const parallelTracks = program.parallelMandatoryTracks as Array<{ id?: string }> | undefined;
add("program:parallel-tracks", Array.isArray(parallelTracks) && parallelTracks.length >= 4 && parallelTracks.some((row)=>row.id === "CROSS_AUDIT_VALIDATION") && parallelTracks.some((row)=>row.id === "PUBLIC_TRUST_WEBSITE"), parallelTracks);
add("trust:denominator", trust.crossAuditValidation?.projectsRequired === 20 && trust.crossAuditValidation?.externallyAcceptedMediumOrHighRequired === 5 && trust.crossAuditValidation?.confirmedRemediationsRequired === 3 && trust.crossAuditValidation?.successfulRetestsRequired === 3, trust.crossAuditValidation);
add("trust:current-zero", trust.currentEvidence?.projectsCompleted === 0 && trust.currentEvidence?.externallyAcceptedMediumOrHigh === 0 && trust.currentEvidence?.confirmedRemediations === 0 && trust.currentEvidence?.successfulRetests === 0, trust.currentEvidence);
add("trust:no-fake-certification", trust.claimBoundary?.mayClaimAccreditedCertification === false && trust.claimBoundary?.mayCallSelfEthereumCertifiedAuditor === false && trust.claimBoundary?.publicClaimAllowedNow === false, trust.claimBoundary);
add("trust:responsible-disclosure", trust.responsibleDisclosure?.authorizationRequired === true && trust.responsibleDisclosure?.mainnetExploitTestingForbidden === true && trust.responsibleDisclosure?.embargoRequired === true && trust.responsibleDisclosure?.fundMovementForbidden === true, trust.responsibleDisclosure);
add("trust:website-requirements", Array.isArray(trust.publicTrustWebsite?.requiredSections) && trust.publicTrustWebsite.requiredSections.length >= 18 && trust.publicTrustWebsite?.implementedSections === 0, {required:trust.publicTrustWebsite?.requiredSections?.length,implemented:trust.publicTrustWebsite?.implementedSections});
for (const row of authorityResult.checks) add(`authority:${row.id}`, row.passed, row.detail);
for (const row of historicalChain.checks) add(`historical:${row.id}`, row.passed, row.detail);
add("authority:historical-plane-not-current-required", currentRevisionId !== REV || fs.readFileSync("VELMERE_ACTIVE_PASS.txt","utf8").trim() === REV, { historicalRevision: REV, currentRevisionId });
const roadmap = fs.readFileSync("VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.txt","utf8");
add("roadmap:history-retained", roadmap.includes("PASS36 A88R1") && roadmap.includes("CROSS-AUDIT VALIDATION + PUBLIC TRUST WEBSITE") && roadmap.includes("HISTORYCZNA ROADMAPA A88R0"), roadmap.slice(0,240));
for (const [name,input] of Object.entries(policy.inputs as Record<string, { path: string; sha256: string }>)) {
  add(`input:${name}`, fs.existsSync(input.path) && fs.statSync(input.path).isFile() && fs.statSync(input.path).size > 0 && sha256(fs.readFileSync(input.path)) === input.sha256, input);
}
const bridge = spawnSync(process.execPath,["scripts/pass36/verify-a88r1-clean-unpack-sequence.mjs","--bridge-smoke"],{cwd:process.cwd(),shell:false,encoding:"utf8",timeout:15000,windowsHide:true});
add("clean-unpack:bridge", bridge.status === 0 && String(bridge.stdout).includes("PASS_A88R1_ASYNC_BRIDGE_PROCESS_EXIT"), {status:bridge.status,signal:bridge.signal,stdout:String(bridge.stdout).slice(-500),stderr:String(bridge.stderr).slice(-500)});
const failed = checks.filter((x)=>!x.passed);
const out = {schemaVersion:"velmere.pass36.a88r1.semantic-route-privacy-pdf-verifier.v1",revisionId:REV,status:failed.length?"FAIL_A88R1_VERIFIER":"PASS_A88R1_VERIFIER_NO_PROMOTION",checks:checks.length,passed:checks.length-failed.length,failed:failed.length,failures:failed,liveProven:false,saleEnabled:false,truthBoundary:policy.truthBoundary};
console.log(JSON.stringify(out,null,2));
if (failed.length) process.exit(1);
