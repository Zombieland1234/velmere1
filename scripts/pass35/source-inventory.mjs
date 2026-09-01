import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export const PASS35_INVENTORY_SCHEMA = "velmere.pass35.source-inventory.v1";
export const PASS35_SOURCE_PACKAGE_CONTROL_METADATA_PATHS = Object.freeze([
  "_velmere/pass35/PASS35_EXTERNAL_BLOCKER_RECEIPT.json",
  "_velmere/pass35/PASS35_LOCAL_PRODUCT_QUALITY_RECEIPT.json",
  "_velmere/pass35/PASS35_LOCAL_PDF_QA_SUMMARY.json",
  "_velmere/pass35/PASS35_READINESS_DASHBOARD.json",
  "artifacts/release/PASS35_CURRENT_STATUS.md",
  "artifacts/release/PASS35_CURRENT_STATUS_SUMMARY.json",
  "artifacts/release/PASS35_A9_PRODUCT_TIER_CONTRACT.md",
  "artifacts/release/PASS35_A9_ZERO_BUDGET_ROADMAP.md",
  "artifacts/release/PASS35_A9_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A10_MARKET_RUNTIME_COVERAGE.md",
  "artifacts/release/PASS35_A10_MARKET_RUNTIME_COVERAGE_SUMMARY.json",
  "artifacts/release/PASS35_A10_ZERO_BUDGET_ROADMAP.md",
  "artifacts/release/PASS35_A10_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A11_MARKET_IMPACT_WHALE_TIER_CONTRACT.md",
  "artifacts/release/PASS35_A11_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A12_PUBLIC_PROVIDER_RUNTIME.md",
  "artifacts/release/PASS35_A12_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A13_FUNCTIONAL_RUNTIME.md",
  "artifacts/release/PASS35_A13_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A14_MARKET_EXECUTION.md",
  "artifacts/release/PASS35_A14_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A15_IMPORTED_SNAPSHOT_RUNTIME.md",
  "artifacts/release/PASS35_A15_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A16_CANONICAL_RISK_RUNTIME.md",
  "artifacts/release/PASS35_A16_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/release/PASS35_A17_EVIDENCE_QUALITY_RUNTIME.json",
  "artifacts/release/PASS35_A17_RISK_CALIBRATION_RUNTIME.json",
  "artifacts/release/PASS35_A17_EVIDENCE_DECISION_RUNTIME.md",
  "artifacts/release/PASS35_A17_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A17_PACKET_PDF_CORPUS_MANIFEST.json",
  "artifacts/pass35/PASS35_A17_PACKET_PDF_QA_RECEIPT.json",
  "artifacts/pass35/PASS35_A17_PACKET_PDF_RASTER_QA_RECEIPT.json",
  "artifacts/pass35/PASS35_A17_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A18_TIER_VALUE_BENCHMARK.md",
  "artifacts/release/PASS35_A18_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RECEIPT.json",
  "artifacts/pass35/PASS35_A18_TIER_VALUE_BENCHMARK_RUNTIME.json",
  "artifacts/pass35/PASS35_A18_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A19_EXACT_RUNTIME_AUDIT_STATIC_BENCHMARK.md",
  "artifacts/release/PASS35_A19_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A19_EXACT_RUNTIME_BOOTSTRAP_EVALUATION.json",
  "artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RUNTIME.json",
  "artifacts/pass35/PASS35_A19_AUDIT_STATIC_BENCHMARK_RECEIPT.json",
  "artifacts/pass35/PASS35_A19_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A20_CASE_BOUND_DEPENDENCY.md",
  "artifacts/release/PASS35_A20_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A20_CASE_BOUND_DEPENDENCY_BENCHMARK.json",
  "artifacts/pass35/PASS35_A20_CASE_BOUND_DEPENDENCY_RECEIPT.json",
  "artifacts/pass35/PASS35_A20_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A21_ABSTRACT_PATH.md",
  "artifacts/release/PASS35_A21_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A21_ABSTRACT_PATH_BENCHMARK.json",
  "artifacts/pass35/PASS35_A21_ABSTRACT_PATH_RECEIPT.json",
  "artifacts/pass35/PASS35_A21_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A22_SEVERITY_TRIAGE.md",
  "artifacts/release/PASS35_A22_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A22_SEVERITY_TRIAGE_RECEIPT.json",
  "artifacts/pass35/PASS35_A22_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A23_REMEDIATION_CLOSURE.md",
  "artifacts/release/PASS35_A23_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A23_REMEDIATION_CLOSURE_RECEIPT.json",
  "artifacts/pass35/PASS35_A23_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A24_MONITORING_LIFECYCLE.md",
  "artifacts/release/PASS35_A24_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A24_MONITORING_LIFECYCLE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A24_MONITORING_LIFECYCLE_RECEIPT.json",
  "artifacts/pass35/PASS35_A24_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A25_EXACT_TEST_EVIDENCE.md",
  "artifacts/release/PASS35_A25_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A25_EXACT_TEST_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A25_EXACT_TEST_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A25_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A26_FUZZ_INVARIANT_EVIDENCE.md",
  "artifacts/release/PASS35_A26_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A26_FUZZ_INVARIANT_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A26_FUZZ_INVARIANT_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A26_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A27_FORK_REPLAY_EVIDENCE.md",
  "artifacts/release/PASS35_A27_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A27_FORK_REPLAY_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A27_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE.md",
  "artifacts/release/PASS35_A28_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_BENCHMARK.json",
  "artifacts/pass35/PASS35_A28_ECONOMIC_ADVERSARIAL_EVIDENCE_RECEIPT.json",
  "artifacts/pass35/PASS35_A28_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS.md",
  "artifacts/release/PASS35_A29_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_BENCHMARK.json",
  "artifacts/pass35/PASS35_A29_UPGRADE_DEPLOYMENT_OPERATIONS_RECEIPT.json",
  "artifacts/pass35/PASS35_A29_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A30_THREAT_MODEL.md",
  "artifacts/release/PASS35_A30_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A30_THREAT_MODEL_BENCHMARK.json",
  "artifacts/pass35/PASS35_A30_THREAT_MODEL_RECEIPT.json",
  "artifacts/pass35/PASS35_A30_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A31_PRIVILEGE_CONTROL.md",
  "artifacts/release/PASS35_A31_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_BENCHMARK.json",
  "artifacts/pass35/PASS35_A31_PRIVILEGE_CONTROL_RECEIPT.json",
  "artifacts/pass35/PASS35_A31_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
  "artifacts/release/PASS35_A32_REPORT_DELIVERY.md",
  "artifacts/release/PASS35_A32_PRODUCT_ROADMAP_SUMMARY.json",
  "artifacts/pass35/PASS35_A32_REPORT_DELIVERY_BENCHMARK.json",
  "artifacts/pass35/PASS35_A32_REPORT_DELIVERY_RECEIPT.json",
  "artifacts/pass35/PASS35_A32_NONDESTRUCTIVE_REGRESSION_RECEIPT.json",
]);
const SELF_OUTPUTS = new Set([
  "_velmere/pass35/PASS35_SOURCE_INVENTORY.json",
  "_velmere/pass35/PASS35_SOURCE_INVENTORY.csv",
  "config/pass36/a102r9-local-regression-receipt.json",
  "config/pass36/a102r9-current-root-descendant-manifest.json",
]);
const GENERATED_DIRECTORIES = new Set([".git", ".next", "node_modules", "coverage", "dist", ".turbo"]);
const ACTIVE_ROOT_DIRECTORIES = new Set([
  ".github", "app", "components", "config", "data", "db", "docs", "evaluation", "fixtures",
  "lib", "messages", "public", "scripts", "store", "supabase", "tests",
]);
const ACTIVE_ROOT_FILES = new Set([
  ".dockerignore", ".env.example", ".gitattributes", ".gitignore", ".node-version", ".npmrc", ".nvmrc",
  ".vercelignore", "CLEAN_SAFE_README.md", "ENV_PRODUCTION_READY.example", "README.md",
  "VELMERE_RUN_FULL_CHECK.ps1", "eslint.config.mjs", "i18n.ts", "navigation.ts", "next-env.d.ts",
  "next.config.mjs", "package-lock.json", "package.json", "playwright.config.ts", "postcss.config.js",
  "proxy.ts", "routing.ts", "tailwind.config.ts", "tsconfig.json", "vercel.json",
  "VELMERE_SETUP_WINDOWS_A34.ps1", "VELMERE_SETUP_WINDOWS_A35.ps1",
  "VELMERE_SETUP_WINDOWS_A36.ps1", "VELMERE_SETUP_WINDOWS_A37.ps1",
  "VELMERE_ACTIVE_PASS.txt", "VELMERE_A43_PATCH.txt", "VELMERE_A44_PATCH.txt",
  "VELMERE_A45_PATCH.txt", "VELMERE_A46_PATCH.txt", "VELMERE_A47_PATCH.txt",
  "VELMERE_A48_PATCH.txt", "VELMERE_A49_PATCH.txt", "VELMERE_A50_PATCH.txt",
  "VELMERE_A51_PATCH.txt", "VELMERE_A52_PATCH.txt", "VELMERE_A53_PATCH.txt",
  "VELMERE_A54_PATCH.txt", "VELMERE_A55_PATCH.txt", "VELMERE_A56_PATCH.txt",
  "VELMERE_A57_PATCH.txt", "VELMERE_A58_PATCH.txt", "VELMERE_A59_PATCH.txt", "VELMERE_A60_PATCH.txt", "VELMERE_A61_PATCH.txt", "VELMERE_A62_PATCH.txt", "VELMERE_A63_PATCH.txt", "VELMERE_A64_PATCH.txt", "VELMERE_A66_PATCH.txt", "VELMERE_A68_PATCH.txt", "VELMERE_A69_PATCH.txt", "VELMERE_A70_PATCH.txt", "VELMERE_A71_PATCH.txt", "VELMERE_A72_PATCH.txt", "VELMERE_A73_PATCH.txt", "VELMERE_A74_PATCH.txt", "VELMERE_A75_PATCH.txt", "VELMERE_A76_PATCH.txt", "VELMERE_A77_PATCH.txt", "VELMERE_A78_PATCH.txt", "VELMERE_A79_PATCH.txt", "VELMERE_A80_PATCH.txt", "VELMERE_A81_PATCH.txt", "VELMERE_A82_PATCH.txt",
  "VELMERE_IMPORT_A47_ACCEPTANCE_EVIDENCE.cmd",
  "VELMERE_RUN_A45_ACCEPTANCE.cmd", "VELMERE_RUN_A46_DATA_ACCEPTANCE.cmd",
  "VELMERE_RUN_A48_STAGING_TENANT_ISOLATION.cmd",
  "VELMERE_RUN_A49_STRIPE_PAYMENT_ACCEPTANCE.cmd",
  "VELMERE_RUN_A50_EMAIL_STORAGE_KMS_ACCEPTANCE.cmd",
  "VELMERE_RUN_A51_BACKUP_RESTORE_ROLLBACK_PROVIDER_LOSS_ACCEPTANCE.cmd",
  "VELMERE_RUN_A52_KILL_SWITCH_INCIDENT_CUSTOMER_COMMUNICATION_ACCEPTANCE.cmd",
  "VELMERE_RUN_A53_MEASURED_SLO_ALERT_ACK_VENDOR_EXIT_ACCEPTANCE.cmd",
  "VELMERE_RUN_A54_STRICT_SLO_ALERT_ACK_VENDOR_EXIT_RECOVERY_ACCEPTANCE.cmd",
  "VELMERE_RUN_A55_INDEPENDENT_RETEST_LEGAL_CUSTOMER_RELEASE_ACCEPTANCE.cmd",
  "VELMERE_RUN_A56_OUT_OF_TIME_SLO_VENDOR_EXIT_OBSERVATION_ACCEPTANCE.cmd",
  "VELMERE_RUN_A57_CONTROLLED_CANARY_KILL_SWITCH_ROLLBACK_TELEMETRY_ACCEPTANCE.cmd",
  "VELMERE_RUN_A60_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.cmd",
  "VELMERE_RUN_A61_HISTORICAL_ARTIFACT_RECOVERY.cmd",
  "VELMERE_RUN_A62_OFFLINE_EXACT_RUNTIME_DEPENDENCY_BOOTSTRAP.cmd",
  "VELMERE_RUN_A63_STAGING_PROGRAM_ORCHESTRATOR.cmd",
  "VELMERE_RUN_A64_HISTORICAL_CONTROL_METADATA_RECOVERY.cmd",
  "VELMERE_RUN_A77_CLEAN_ROOT_GOVERNANCE_INTAKE.cmd",
  "VELMERE_RUN_A78_EXACT_RUNTIME_LOCKFILE_BROWSER_BOOTSTRAP.cmd",
  "VELMERE_RUN_A79_EXACT_FINAL_BYTE_BUILD_BROWSER_ACCEPTANCE.cmd",
  "VELMERE_RUN_A80_FROZEN_LOCAL_RELEASE_CANDIDATE.cmd",
  "VELMERE_RUN_A81_CANONICAL_MEGA_MATRIX.cmd",
  "VELMERE_RUN_A82_AUDIT_REAL_CONTRACT_MATRIX.cmd",
  "VELMERE_VERIFY_A81_CLEAN_UNPACK.cmd", "VELMERE_VERIFY_A82_CLEAN_UNPACK.cmd",
  "VELMERE_START_A42.cmd", "VELMERE_START_A43.cmd", "VELMERE_START_A44.cmd",
  "VELMERE_START_A45.cmd",
]);

const lexical = (left, right) => left < right ? -1 : left > right ? 1 : 0;
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalize(relativePath) {
  return relativePath.split(path.sep).join("/");
}

export function classifyPass35Path(relativePath) {
  const normalized = normalize(relativePath);
  const [root] = normalized.split("/");
  const base = path.posix.basename(normalized);
  if (SELF_OUTPUTS.has(normalized)) return { role: "GENERATED", sourceIncluded: false, reason: "self_referential_inventory_output" };
  const transientGenerated = (
    (base.startsWith(".") && base.endsWith(".lock"))
    || /(?:^|\/)pdf-corpus\.tmp-[0-9]+-[0-9]+(?:\/|$)/u.test(normalized)
    || /(?:^|\/)[^/]+\.tmp-[0-9]+(?:-[0-9]+)?(?:\/|$)/u.test(normalized)
    || base.endsWith(".partial")
  );
  if (transientGenerated) return { role: "GENERATED", sourceIncluded: false, reason: "transient_atomic_generation_artifact" };
  if (GENERATED_DIRECTORIES.has(root) || root.startsWith(".next-pass25-") || /^tsconfig\.tmp.*\.json$/u.test(base)) {
    return { role: "GENERATED", sourceIncluded: false, reason: "generated_dependency_or_build_output" };
  }
  if (normalized.startsWith(".velmere/quarantine/")) {
    return { role: "QUARANTINE", sourceIncluded: false, reason: "recovery_only_quarantine" };
  }
  if (normalized.startsWith(".velmere/")) {
    return { role: "EVIDENCE", sourceIncluded: false, reason: "diagnostic_or_runtime_receipt" };
  }
  if (normalized === "_velmere/pass35/PASS35_OFFLINE_EXECUTION_RECEIPT.json") {
    return { role: "EVIDENCE", sourceIncluded: true, reason: "declared_current_candidate_summary" };
  }
  if (normalized.startsWith("_velmere/pass35/")) {
    return { role: "EVIDENCE", sourceIncluded: false, reason: "generated_current_candidate_evidence" };
  }
  if (normalized.startsWith("_velmere/")) {
    return { role: "HISTORY", sourceIncluded: false, reason: "superseded_release_metadata" };
  }
  if (normalized.startsWith("artifacts/release/history/")) {
    return { role: "HISTORY", sourceIncluded: false, reason: "immutable_release_history" };
  }
  if (normalized === "artifacts/pass35/pdf-corpus"
    || normalized.startsWith("artifacts/pass35/pdf-corpus/")
    || normalized === "artifacts/pass35/renders"
    || normalized.startsWith("artifacts/pass35/renders/")) {
    return { role: "GENERATED", sourceIncluded: false, reason: "transient_duplicate_pdf_qa_output" };
  }
  if (normalized.startsWith("artifacts/")) {
    return { role: "EVIDENCE", sourceIncluded: false, reason: "engineering_evidence_or_diagnostic" };
  }
  if (normalized === "CLEAN_SAFE_VERIFICATION.json") {
    return { role: "HISTORY", sourceIncluded: false, reason: "superseded_pass26_verification" };
  }
  if (/^VELMERE_.*(?:PASS34|PASS33|PASS32).*\.(?:txt|xlsx)$/u.test(normalized)) {
    return { role: "HISTORY", sourceIncluded: false, reason: "superseded_root_roadmap" };
  }
  if (ACTIVE_ROOT_DIRECTORIES.has(root)) {
    return { role: "ACTIVE_SOURCE", sourceIncluded: true, reason: "declared_active_source_root" };
  }
  const controlledPassRootFile = (
    /^VELMERE_A[0-9]+(?:R[0-9]+)?_PATCH\.txt$/u.test(normalized)
    || /^VELMERE_RUN_A[0-9]+(?:R[0-9]+)?_[A-Z0-9_]+\.cmd$/u.test(normalized)
    || /^VELMERE_VERIFY_A[0-9]+(?:R[0-9]+)?_[A-Z0-9_]+\.cmd$/u.test(normalized)
  );
  if (ACTIVE_ROOT_FILES.has(normalized) || controlledPassRootFile || /^tsconfig(?:\..+)?\.json$/u.test(normalized) || /^VELMERE_WORLD_CLASS_MAX_ROADMAP_PASS35.*\.txt$/u.test(normalized)) {
    return { role: "ACTIVE_SOURCE", sourceIncluded: true, reason: controlledPassRootFile ? "controlled_pass_root_artifact" : "declared_active_root_file" };
  }
  return { role: "UNKNOWN", sourceIncluded: false, reason: "owner_classification_required" };
}

export function collectPass35Inventory(rootPath) {
  const root = path.resolve(rootPath);
  if (!statSync(root).isDirectory()) throw new Error("pass35_inventory_root_not_directory");
  const entries = [];
  const skippedGeneratedDirectories = [];
  function walk(directory, prefix = "") {
    for (const item of readdirSync(directory, { withFileTypes: true }).sort((a, b) => lexical(a.name, b.name))) {
      const relativePath = prefix ? `${prefix}/${item.name}` : item.name;
      const normalized = normalize(relativePath);
      const classification = classifyPass35Path(normalized);
      if (item.isDirectory() && classification.role === "GENERATED") {
        skippedGeneratedDirectories.push({ path: normalized, reason: classification.reason });
        continue;
      }
      const absolutePath = path.join(directory, item.name);
      const metadata = lstatSync(absolutePath);
      if (metadata.isSymbolicLink()) throw new Error(`pass35_symlink_forbidden:${normalized}`);
      if (metadata.isDirectory()) {
        walk(absolutePath, normalized);
        continue;
      }
      if (!metadata.isFile()) throw new Error(`pass35_special_file_forbidden:${normalized}`);
      const bytes = readFileSync(absolutePath);
      entries.push({
        path: normalized,
        role: classification.role,
        sourceIncluded: classification.sourceIncluded,
        reason: classification.reason,
        byteLength: bytes.length,
        sha256: sha256(bytes),
        mode: (metadata.mode & 0o111) === 0 ? 0o100644 : 0o100755,
      });
    }
  }
  walk(root);
  entries.sort((a, b) => lexical(a.path, b.path));
  const roles = Object.fromEntries(["ACTIVE_SOURCE", "EVIDENCE", "HISTORY", "QUARANTINE", "GENERATED", "UNKNOWN"].map((role) => {
    const selected = entries.filter((entry) => entry.role === role);
    return [role, { fileCount: selected.length, byteLength: selected.reduce((sum, entry) => sum + entry.byteLength, 0) }];
  }));
  const sourceEntries = entries.filter((entry) => entry.sourceIncluded);
  const evidenceEntries = entries.filter((entry) => !entry.sourceIncluded && ["EVIDENCE", "HISTORY", "QUARANTINE"].includes(entry.role));
  return {
    schemaVersion: PASS35_INVENTORY_SCHEMA,
    candidateId: "VELMERE_PASS35_OFFLINE_CANDIDATE_R3",
    classificationPolicy: "explicit_roots_fail_unknown",
    truthBoundary: "Classification proves package composition, not runtime, legal, staging, live, independent, or customer readiness.",
    entries,
    roles,
    skippedGeneratedDirectories,
    unknownCount: roles.UNKNOWN.fileCount,
    source: {
      fileCount: sourceEntries.length,
      byteLength: sourceEntries.reduce((sum, entry) => sum + entry.byteLength, 0),
      pathSetSha256: sha256(sourceEntries.map((entry) => entry.path).join("\n")),
      aggregateSha256: sha256(canonicalJson(sourceEntries)),
    },
    evidence: {
      fileCount: evidenceEntries.length,
      byteLength: evidenceEntries.reduce((sum, entry) => sum + entry.byteLength, 0),
      pathSetSha256: sha256(evidenceEntries.map((entry) => entry.path).join("\n")),
      aggregateSha256: sha256(canonicalJson(evidenceEntries)),
    },
  };
}
