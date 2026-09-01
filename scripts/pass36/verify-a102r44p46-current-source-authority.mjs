#!/usr/bin/env node
import { validateCurrentSourceAuthorityExact } from "./current-source-authority-lib.mjs";

const REVISION = "VELMERE_PASS36_A102R44P46_ACTION_REQUIRED_LEGACY_MULTIPLICATION_ECONOMIC_SINK_TRUTH_REBASE_NO_LIVE_CREDIT";
const PARENT = "VELMERE_PASS36_A102R44P45_ACTION_REQUIRED_CONTINUOUS_CURRENT_STATE_CONTEXT_QUALIFIED_INTERACTION_ORDERING_PUBLIC_CONTROL_DELTA_NO_LIVE_CREDIT";
const MANIFEST_PATH = "_velmere/PASS36_A102R44P46_SOURCE_ONLY_MANIFEST.json";
const MANIFEST_SCHEMA = "velmere.pass36.a102r44p46.source-manifest.v1";

const result = validateCurrentSourceAuthorityExact(process.cwd(), { expectedRevisionId: REVISION });
const passed = result.passed === true
  && result.revisionId === REVISION
  && result.parentRevisionId === PARENT
  && result.manifestPath === MANIFEST_PATH
  && result.manifestSchema === MANIFEST_SCHEMA
  && /^[a-f0-9]{64}$/u.test(String(result.manifestSha256 ?? ""))
  && /^[a-f0-9]{64}$/u.test(String(result.manifestDigestSha256 ?? ""))
  && /^[a-f0-9]{64}$/u.test(String(result.sourceFingerprint ?? ""))
  && result.payload?.aggregateSha256 === result.sourceFingerprint
  && result.mismatches.length === 0;

process.stdout.write(`${JSON.stringify({
  schemaVersion: "velmere.pass36.a102r44p46.current-source-authority-verification.v1",
  status: passed
    ? "PASS_A102R44P46_CURRENT_SOURCE_AUTHORITY_EXACT_NO_LIVE_OR_SALE_CREDIT"
    : "FAIL_A102R44P46_CURRENT_SOURCE_AUTHORITY_EXACT",
  revisionId: result.revisionId,
  parentRevisionId: result.parentRevisionId,
  manifestPath: result.manifestPath,
  manifestSchema: result.manifestSchema,
  manifestFileSha256: result.manifestSha256,
  manifestSha256: result.manifestDigestSha256,
  sourceFingerprint: result.sourceFingerprint,
  payload: result.payload,
  mismatches: result.mismatches,
  rejected: result.rejected,
  globalDecision: "NO_GO",
  LIVE: false,
  live: false,
  liveProven: false,
  saleEnabled: false,
  productionApproved: false,
  worldClassProven: false,
}, null, 2)}\n`);
if (!passed) process.exitCode = 1;
