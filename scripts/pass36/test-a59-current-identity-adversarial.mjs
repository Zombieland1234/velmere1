#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  assertApiIdentityBinding,
  assertBudgetTupleBinding,
  assertCssIdentityBinding,
  budgetTupleSha256,
  inspectApiIdentity,
  inspectCssIdentity,
  sha256,
} from "./a59-current-identity-lib.mjs";
import {
  analyzeCssExactDuplicates,
  buildCurrentCssDedupScan,
  CURRENT_CSS_DEDUP_SCHEMA,
  CURRENT_CSS_DEDUP_STATUS,
  verifyCurrentCssDedupReceipt,
} from "./a59-current-css-dedup-lib.mjs";

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a59-identity-adversarial-"));
const assertions = [];
const record = (id, ok, detail = null) => assertions.push({ id, ok: Boolean(ok), detail });
const expectReject = (id, action, expectedCode = null) => {
  try {
    action();
    record(id, false, "accepted");
  } catch (error) {
    const codeMatches = expectedCode === null || error.code === expectedCode;
    record(id, codeMatches, { code: error.code ?? null, message: error.message });
  }
};

const clone = (value) => structuredClone(value);
const writeFixture = (relative, value) => {
  const absolute = path.join(fixtureRoot, relative);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, value);
};

try {
  writeFixture("app/a.css", ".a{color:red}\n");
  writeFixture("app/b.css", ".b{color:red}\n");
  writeFixture("app/api/a/route.ts", "export function GET() {}\n");
  writeFixture("app/api/b/route.ts", "export function GET() {}\n");
  const aBytes = fs.readFileSync(path.join(fixtureRoot, "app/a.css"));
  const bBytes = fs.readFileSync(path.join(fixtureRoot, "app/b.css"));
  const baseProfile = [{ file: "app/a.css", bytes: aBytes.length, lines: 1 }];
  const baseReceipt = [{ path: "app/a.css", afterBytes: aBytes.length, afterSha256: sha256(aBytes), parseErrorsAfter: 0 }];
  const inspectCss = (profileCssPressure = baseProfile, receiptFiles = baseReceipt) => inspectCssIdentity({
    root: fixtureRoot,
    profileCssPressure,
    receiptFiles,
    allowedRoots: ["app", "components"],
  });
  const cssBinding = inspectCss();
  assertCssIdentityBinding(cssBinding, cssBinding);
  record("css-positive-control", true);

  const aliasProfile = [{ ...baseProfile[0], file: "app/styles/../a.css" }];
  const aliasReceipt = [{ ...baseReceipt[0], path: "app/styles/../a.css" }];
  expectReject("css-dotdot-alias-rejected", () => inspectCss(aliasProfile, aliasReceipt), "CSS_PATH_NON_CANONICAL");
  expectReject("css-duplicate-path-rejected", () => inspectCss(baseProfile, [...baseReceipt, clone(baseReceipt[0])]), "CSS_RECEIPT_DUPLICATE_PATH");
  const absoluteProfile = [{ ...baseProfile[0], file: path.join(fixtureRoot, "app/a.css") }];
  const absoluteReceipt = [{ ...baseReceipt[0], path: path.join(fixtureRoot, "app/a.css") }];
  expectReject("css-absolute-path-rejected", () => inspectCss(absoluteProfile, absoluteReceipt), "CSS_PATH_ABSOLUTE");
  const backslashProfile = [{ ...baseProfile[0], file: "app\\a.css" }];
  const backslashReceipt = [{ ...baseReceipt[0], path: "app\\a.css" }];
  expectReject("css-backslash-path-rejected", () => inspectCss(backslashProfile, backslashReceipt), "CSS_PATH_NON_POSIX");
  fs.symlinkSync("a.css", path.join(fixtureRoot, "app/link.css"));
  const symlinkProfile = [{ ...baseProfile[0], file: "app/link.css" }];
  const symlinkReceipt = [{ ...baseReceipt[0], path: "app/link.css" }];
  expectReject("css-symlink-rejected", () => inspectCss(symlinkProfile, symlinkReceipt), "CSS_PATH_SYMLINK");
  const substituteProfile = [{ file: "app/b.css", bytes: bBytes.length, lines: 1 }];
  const substituteReceipt = [{ path: "app/b.css", afterBytes: bBytes.length, afterSha256: sha256(bBytes), parseErrorsAfter: 0 }];
  const substituteCss = inspectCss(substituteProfile, substituteReceipt);
  expectReject("css-same-count-path-substitution-rejected", () => assertCssIdentityBinding(substituteCss, cssBinding), "CSS_BINDING_PATHSETSHA256_MISMATCH");
  const wrongHashReceipt = [{ ...baseReceipt[0], afterSha256: "0".repeat(64) }];
  expectReject("css-final-byte-hash-tamper-rejected", () => inspectCss(baseProfile, wrongHashReceipt), "CSS_RECEIPT_HASH_MISMATCH");

  const buildDedupReceipt = (profileCssPressure = baseProfile, receiptFiles = baseReceipt) => {
    const scan = buildCurrentCssDedupScan({
      root: fixtureRoot,
      profileCssPressure,
      receiptFiles,
      allowedRoots: ["app", "components"],
    });
    return {
      schemaVersion: CURRENT_CSS_DEDUP_SCHEMA,
      status: CURRENT_CSS_DEDUP_STATUS,
      evidenceClass: "TESTED_STATIC",
      writeMode: false,
      cssMutationApplied: false,
      profileIdentity: scan.profileIdentity,
      files: scan.files,
      totals: scan.totals,
    };
  };
  const verifyDedup = (receipt, profileCssPressure = baseProfile, receiptFiles = baseReceipt) => verifyCurrentCssDedupReceipt({
    root: fixtureRoot,
    profileCssPressure,
    receiptFiles,
    allowedRoots: ["app", "components"],
    receipt,
  });
  const dedupReceipt = buildDedupReceipt();
  verifyDedup(dedupReceipt);
  record("css-dedup-current-read-only-positive-control", true);
  const omittedDedup = clone(dedupReceipt);
  omittedDedup.files = [];
  expectReject("css-dedup-omitted-profile-row-rejected", () => verifyDedup(omittedDedup), "CSS_DEDUP_FILE_ROWS_MISMATCH");
  const substitutedDedup = buildDedupReceipt(substituteProfile, substituteReceipt);
  expectReject("css-dedup-same-count-path-substitution-rejected", () => verifyDedup(substitutedDedup), "CSS_DEDUP_PROFILE_IDENTITY_MISMATCH");
  const forgedDedup = clone(dedupReceipt);
  forgedDedup.files[0].currentDuplicateExtras = 0;
  forgedDedup.files[0].sha256 = "0".repeat(64);
  expectReject("css-dedup-file-hash-forgery-rejected", () => verifyDedup(forgedDedup), "CSS_DEDUP_FILE_ROWS_MISMATCH");
  const mutatingDedup = clone(dedupReceipt);
  mutatingDedup.writeMode = true;
  expectReject("css-dedup-write-mode-claim-rejected", () => verifyDedup(mutatingDedup), "CSS_DEDUP_READ_ONLY_BOUNDARY_INVALID");
  const exactDuplicateAnalysis = analyzeCssExactDuplicates(".duplicate{color:red}\n.duplicate{color:red}\n");
  record("css-dedup-actual-duplicate-detected", exactDuplicateAnalysis.currentDuplicateExtras === 1, exactDuplicateAnalysis);
  const atRuleDuplicateAnalysis = analyzeCssExactDuplicates('@import url("a.css");\n@import url("a.css");\n');
  record("css-dedup-at-rule-statement-duplicate-detected", atRuleDuplicateAnalysis.currentDuplicateExtras === 1, atRuleDuplicateAnalysis);
  const startingStyleAnalysis = analyzeCssExactDuplicates("@starting-style{.duplicate{color:red}.duplicate{color:red}}");
  record("css-dedup-starting-style-duplicate-detected", startingStyleAnalysis.currentDuplicateExtras === 1, startingStyleAnalysis);
  expectReject("css-dedup-malformed-unbalanced-rejected", () => analyzeCssExactDuplicates(".broken{color:red"), "CSS_DEDUP_UNBALANCED_BRACE");
  expectReject("css-dedup-unparsed-tail-rejected", () => analyzeCssExactDuplicates("}"), "CSS_DEDUP_STRAY_CLOSING_BRACE");
  expectReject("css-dedup-stray-closing-paren-rejected", () => analyzeCssExactDuplicates(")"), "CSS_DEDUP_STRAY_CLOSING_PAREN");
  expectReject("css-dedup-stray-closing-bracket-rejected", () => analyzeCssExactDuplicates("]"), "CSS_DEDUP_STRAY_CLOSING_BRACKET");

  const duplicateBytes = Buffer.from(".a{color:red}\n.a{color:red}\n");
  writeFixture("app/a.css", duplicateBytes);
  const duplicateProfile = [{ file: "app/a.css", bytes: duplicateBytes.length, lines: 2 }];
  const duplicateCompaction = [{ path: "app/a.css", afterBytes: duplicateBytes.length, afterSha256: sha256(duplicateBytes), parseErrorsAfter: 0 }];
  const duplicateReceipt = buildDedupReceipt(duplicateProfile, duplicateCompaction);
  expectReject(
    "css-dedup-physical-current-duplicate-closure-rejected",
    () => verifyDedup(duplicateReceipt, duplicateProfile, duplicateCompaction),
    "CSS_DEDUP_CURRENT_EXTRAS_PRESENT",
  );
  writeFixture("app/a.css", ".a{color:red}\n");

  const counts = {
    control_plane: 0,
    machine_webhook: 0,
    admin_operator: 0,
    authenticated_customer: 0,
    public_product: 1,
    unclassified: 0,
  };
  const baseRoute = {
    path: "/api/a",
    file: "app/api/a/route.ts",
    methods: ["POST"],
    mutating: true,
    bodyBoundary: true,
    bodyHandling: "stream_bounded",
    bodyBoundaryEvidence: ["readBoundedJsonBody"],
    sourceClass: "public_product",
  };
  const baseInventory = {
    passId: "fixture",
    routeCount: 1,
    counts,
    controlPlaneCount: 0,
    mutatingRouteCount: 1,
    boundedMutatingRouteCount: 1,
    unboundedMutatingRouteCount: 0,
    boundedMutatingCoveragePercent: 100,
    allMutatingBodyHandlingCounts: { stream_bounded: 1, body_rejected: 0 },
    routes: [baseRoute],
  };
  const inspectApi = (inventory = baseInventory) => inspectApiIdentity({
    root: fixtureRoot,
    inventory,
    allowedFileRoots: ["app", "lib"],
  });
  const apiBinding = inspectApi();
  assertApiIdentityBinding(apiBinding, apiBinding);
  record("api-positive-control", true);

  writeFixture("app/api/a/route.ts", "export function GET() {}\n// same-path byte mutation\n");
  expectReject("api-same-path-handler-byte-mutation-rejected", () => assertApiIdentityBinding(inspectApi(), apiBinding), "API_ROUTE_IDENTITY_MISMATCH");
  writeFixture("app/api/a/route.ts", "export function GET() {}\n");

  const duplicateApi = clone(baseInventory);
  duplicateApi.routeCount = 2;
  duplicateApi.counts.public_product = 2;
  duplicateApi.routes.push(clone(baseRoute));
  expectReject("api-duplicate-path-rejected", () => inspectApi(duplicateApi), "API_DUPLICATE_PATH");
  const aliasApi = clone(baseInventory);
  aliasApi.routes[0].path = "/api/x/../a";
  expectReject("api-dotdot-path-rejected", () => inspectApi(aliasApi), "API_PATH_NON_CANONICAL");
  const fileAliasApi = clone(baseInventory);
  fileAliasApi.routes[0].file = "app/api/a/../a/route.ts";
  expectReject("api-handler-file-dotdot-alias-rejected", () => inspectApi(fileAliasApi), "API_FILE_PATH_NON_CANONICAL");
  fs.mkdirSync(path.join(fixtureRoot, "app/api/link"), { recursive: true });
  fs.symlinkSync("../a/route.ts", path.join(fixtureRoot, "app/api/link/route.ts"));
  const fileSymlinkApi = clone(baseInventory);
  fileSymlinkApi.routes[0].file = "app/api/link/route.ts";
  expectReject("api-handler-file-symlink-rejected", () => inspectApi(fileSymlinkApi), "API_FILE_PATH_SYMLINK");
  const substituteApi = clone(baseInventory);
  substituteApi.routes[0].path = "/api/b";
  substituteApi.routes[0].file = "app/api/b/route.ts";
  expectReject("api-same-count-path-substitution-rejected", () => assertApiIdentityBinding(inspectApi(substituteApi), apiBinding), "API_ROUTE_IDENTITY_MISMATCH");
  const methodApi = clone(baseInventory);
  methodApi.routes[0].methods = ["PUT"];
  expectReject("api-method-substitution-rejected", () => assertApiIdentityBinding(inspectApi(methodApi), apiBinding), "API_ROUTE_IDENTITY_MISMATCH");
  const classApi = clone(baseInventory);
  classApi.routes[0].sourceClass = "authenticated_customer";
  classApi.counts.public_product = 0;
  classApi.counts.authenticated_customer = 1;
  expectReject("api-class-substitution-rejected", () => assertApiIdentityBinding(inspectApi(classApi), apiBinding), "API_ROUTE_IDENTITY_MISMATCH");
  const handlingApi = clone(baseInventory);
  handlingApi.routes[0].bodyHandling = "body_rejected";
  handlingApi.routes[0].bodyBoundaryEvidence = ["rejectRequestBody"];
  handlingApi.allMutatingBodyHandlingCounts = { stream_bounded: 0, body_rejected: 1 };
  expectReject("api-body-policy-substitution-rejected", () => assertApiIdentityBinding(inspectApi(handlingApi), apiBinding), "API_ROUTE_IDENTITY_MISMATCH");
  const declaredSummaryApi = clone(baseInventory);
  declaredSummaryApi.routeCount = 2;
  expectReject("api-declared-summary-tamper-rejected", () => inspectApi(declaredSummaryApi), "API_DECLARED_SUMMARY_MISMATCH");

  const baseBudgets = { alphaMax: 1, betaMax: 2 };
  const expectedBudgetDigest = budgetTupleSha256(baseBudgets);
  assertBudgetTupleBinding(baseBudgets, expectedBudgetDigest);
  record("budget-positive-control", true);
  expectReject("budget-threshold-increase-rejected", () => assertBudgetTupleBinding({ ...baseBudgets, betaMax: 3 }, expectedBudgetDigest), "BUDGET_TUPLE_BINDING_MISMATCH");
} catch (error) {
  record("suite-unexpected-error", false, { code: error.code ?? null, message: error.stack ?? error.message });
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

const failures = assertions.filter((row) => !row.ok);
const result = {
  schemaVersion: "velmere.pass36.a59.current-identity-adversarial-test.v1",
  status: failures.length === 0 ? "PASS_A59_CURRENT_IDENTITY_ADVERSARIAL" : "FAIL_A59_CURRENT_IDENTITY_ADVERSARIAL",
  summary: {
    assertions: assertions.length,
    passed: assertions.length - failures.length,
    failed: failures.length,
  },
  assertions,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length > 0) process.exit(1);
