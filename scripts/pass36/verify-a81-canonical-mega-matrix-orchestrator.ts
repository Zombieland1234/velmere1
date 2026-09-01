#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import {
  A81_REVISION,
  runA81CanonicalMegaMatrix,
  verifyA81CanonicalMegaMatrix,
} from "../../lib/worldclass/pass36-a81-canonical-mega-matrix-runtime.ts";

const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8"));
const policy = readJson("config/pass36/a81-canonical-mega-matrix-orchestrator.json");
const receipt = readJson("config/pass36/a81-test-receipt.json");
const current = readJson("config/pass35/current-revision.json");
const authority = readJson("config/pass36/current-release-authority.json");
const state = readJson("config/pass36/a81-current-state.json");
const program = readJson(current.worldClassCompletionProgramPath);
const runtime = runA81CanonicalMegaMatrix(process.cwd(), policy);
const checks: Array<{ id: string; passed: boolean; detail?: unknown }> = [];
const check = (id: string, passed: unknown, detail?: unknown) => checks.push({ id, passed: Boolean(passed), detail });

check("policy:revision", policy.revisionId === A81_REVISION, policy.revisionId);
check("policy:parent", policy.parentRevisionId === "VELMERE_PASS36_A80R0_FROZEN_LOCAL_RELEASE_CANDIDATE_ADMISSION_AND_PROMOTION_SEAL_HARDENING", policy.parentRevisionId);
check("policy:modules", policy.modules?.length === 10, policy.modules?.length);
check("policy:channels", policy.channels?.length === 6, policy.channels);
check("policy:closed-gaps", policy.closedByA81?.length === 19, policy.closedByA81?.length);
check("runtime:verify", verifyA81CanonicalMegaMatrix(runtime, policy, receipt.runtimeIntegritySha256), runtime.integrity);
check("runtime:receipt-digest", receipt.runtimeIntegritySha256 === runtime.integrity.digest, { declared: receipt.runtimeIntegritySha256, observed: runtime.integrity.digest });
check("runtime:denominators", runtime.denominators.packetRows === 4500 && runtime.denominators.channelProjections === 27000 && runtime.denominators.mutationDenominator === 36000 && runtime.denominators.mutationKilled === 36000, runtime.denominators);
check("runtime:invariants", Object.values(runtime.invariants).every((value) => value === 0), runtime.invariants);
check("receipt:pass", receipt.status === "PASS_A81_LOCAL_CANONICAL_MEGA_MATRIX_SYNTHETIC_ONLY" && receipt.summary?.failed === 0, receipt.summary);
check("receipt:no-credit", receipt.canonicalProviderBoundOutputsExecuted === 0 && receipt.physicalCustomerPdfOutputsExecuted === 0 && receipt.browserRunsExecuted === 0 && receipt.modelRunsExecuted === 0, null);
check("current:revision", current.sourceRevisionId === current.currentReleaseAuthorityRevisionId && current.currentRootDescendantManifestRevisionId === current.sourceRevisionId, current.sourceRevisionId);
check("current:a81", current.canonicalMegaMatrixRevisionId === A81_REVISION && current.canonicalMegaMatrixImplemented === true && current.canonicalProviderBoundMatrixExecuted === false, { revision: current.canonicalMegaMatrixRevisionId, implemented: current.canonicalMegaMatrixImplemented, providerBound: current.canonicalProviderBoundMatrixExecuted });
check("current:denominators", current.canonicalMegaMatrixPacketRows === 4500 && current.canonicalMegaMatrixChannelProjections === 27000 && current.canonicalMegaMatrixMutationKillRate === 1, null);
check("authority:revision", authority.authorityRevisionId === current.sourceRevisionId && authority.currentSource?.revisionId === current.sourceRevisionId, authority.currentSource);
check("authority:a81", authority.planes?.canonicalMegaMatrix?.revisionId === A81_REVISION && authority.planes?.canonicalMegaMatrix?.localSyntheticVerified === true && authority.planes?.canonicalMegaMatrix?.canonicalProviderBoundExecuted === false, authority.planes?.canonicalMegaMatrix);
check("state:decision", state.revisionId === A81_REVISION && state.decision === "PASS_LOCAL_CANONICAL_MEGA_MATRIX_SYNTHETIC_ONLY", state.decision);
check("state:no-credit", state.claims?.canonicalProviderBoundOutputsExecuted === false && state.claims?.physicalCustomerPdfOutputsExecuted === false && state.claims?.browserRunsExecuted === false && state.claims?.modelRunsExecuted === false, state.claims);
check("program:revision", program.revisionId === current.sourceRevisionId, program.revisionId);
const a81ProgramPass = (program.passes as Array<{ passNumber?: number; status?: string }> | undefined)?.find((row) => row.passNumber === 81);
check("program:a81", a81ProgramPass?.status === "DONE_LOCAL_SYNTHETIC_ORCHESTRATOR_BLOCKED_FROZEN_A80_AND_REAL_CASES", a81ProgramPass);
const currentPass = Number((current.sourceRevisionId.match(/PASS36_A(\d+)R/u) ?? [])[1]);
check("program:remaining", Number.isInteger(currentPass) && program.programRange?.[`remainingAfterA${currentPass}`] === program.programRange?.lastPlannedPass - currentPass, program.programRange);
check("active", readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim() === current.sourceRevisionId, readFileSync("VELMERE_ACTIVE_PASS.txt", "utf8").trim());
check("runner:present", existsSync("VELMERE_RUN_A81_CANONICAL_MEGA_MATRIX.cmd"));
check("patch:present", existsSync("VELMERE_A81_PATCH.txt"));
check("truth:no-a80-credit", state.exactA80Candidate?.verified === false && authority.planes?.frozenLocalReleaseCandidate?.verified === false, null);
check("truth:no-live-sale", state.claims?.liveProven === false && state.claims?.saleEnabled === false && authority.claims?.liveProven === false && authority.claims?.saleEnabled === false, null);

const failed = checks.filter((row) => !row.passed);
const report = {
  schemaVersion: "velmere.pass36.a81.canonical-mega-matrix-verification.v1",
  revisionId: A81_REVISION,
  status: failed.length ? "FAIL_A81_CANONICAL_MEGA_MATRIX" : "PASS_A81_LOCAL_CANONICAL_MEGA_MATRIX_NO_REAL_EXECUTION_CREDIT",
  checks: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  denominators: runtime.denominators,
  invariants: runtime.invariants,
  canonicalProviderBoundOutputsExecuted: 0,
  physicalCustomerPdfOutputsExecuted: 0,
  browserRunsExecuted: 0,
  modelRunsExecuted: 0,
  exactA80CandidateBound: false,
  customerPurchaseWorthinessProven: false,
  liveProven: false,
  saleEnabled: false,
  truthBoundary: policy.truthBoundary,
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
