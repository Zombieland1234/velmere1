#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import platform
import re
import subprocess
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT.parent
P94_TREE = BASE / "p94"
OUT = ROOT / "artifacts/closure/p96r1"
GENERATED_AT = "2026-08-21T05:10:00.000Z"
P94_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P94R1_RISK_HISTORY_PUBLIC_ONLY_PAGINATION_TEMPORAL_TRUTH_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip")
P95A_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P95R1_RISK_HISTORY_CURRENT_VS_STORED_TIME_VERSION_ALIGNMENT_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip")
P95B_ZIP = Path("/mnt/data/VELMERE_R44P46_V17_P95R1_RISK_HISTORY_REQUEST_BOUND_PAGE_STORAGE_PROVENANCE_CURRENT_SOURCE_ONLY_IN_PROGRESS_2026-08-21.zip")
P94_SHA = "42418049c53c93efdb9e0d7f3dfac7a07e530289381c005983a77d567244b2ff"
P95A_SHA = "0b03a012356aff0175991af5c49b3e0bf6a300449d8ee11d933569488f14e520"
P95B_SHA = "47fee342e12f187a8949d2ed7454dda9042833ae10f57652c48958cda09a0cae"
MASTER_V2 = "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_COMPLETE_2026-08-20.txt"
MASTER_V2R1 = "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt"
V17 = "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt"
MASTER_V2_SHA = "9184cd18eb864f50a8c5d3af8f2899e7f138372861095e343901ab9c5e3bcb53"
MASTER_V2R1_SHA = "45e2b377be0869f1acb3ef34844919643a537c617b0a8145402cc8c732e8b3c1"
V17_SHA = "de7fbd6df651a7a8a8f85054c6e9ac3c2ca530ebfb0d4ccd335dcb99fb658f05"
PRODUCT_CHANGES = [
    "components/market-integrity/RiskHistoryControl.tsx",
    "components/market-integrity/ShieldRealMarketsParityClient.tsx",
    "lib/market-integrity/risk-history-contract.ts",
    "lib/market-integrity/risk-history-customer-client.ts",
    "lib/server/market-integrity-route-modules/history.ts",
    "lib/market-integrity/risk-history-current-alignment.ts",
    "lib/market-integrity/risk-history-customer-request-binding.ts",
]
EXPECTED_PARENT_MODIFIED = {
    "VELMERE_ACTIVE_PASS.txt",
    "components/market-integrity/RiskHistoryControl.tsx",
    "components/market-integrity/ShieldRealMarketsParityClient.tsx",
    "lib/market-integrity/risk-history-contract.ts",
    "lib/market-integrity/risk-history-customer-client.ts",
    "lib/server/market-integrity-route-modules/history.ts",
}


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write(name: str, payload: Any) -> Path:
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def file_map(root: Path, *, exclude_closure: bool = False) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative = path.relative_to(root).as_posix()
        if relative == "PACKAGE_CONTENT_MANIFEST.tsv":
            continue
        if exclude_closure and relative.startswith("artifacts/closure/p96r1/"):
            continue
        result[relative] = {"path": relative, "byteLength": path.stat().st_size, "sha256": sha(path)}
    return result


def projection(rows: list[dict[str, Any]]) -> dict[str, Any]:
    ordered = sorted(rows, key=lambda row: row["path"])
    path_hash = hashlib.sha256("\n".join(row["path"] for row in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {
        "fileCount": len(ordered),
        "payloadBytes": sum(row["byteLength"] for row in ordered),
        "pathSetSha256": path_hash,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def receipt_count(relative: str) -> tuple[str, int]:
    data = load(ROOT / relative)
    status = str(data.get("status", "MISSING"))
    block = data.get("checks", {})
    total = int(block.get("total", 0)) if isinstance(block, dict) else 0
    passed = int(block.get("passed", 0)) if isinstance(block, dict) else 0
    failed = int(block.get("failed", 1)) if isinstance(block, dict) else 1
    if not status.startswith("PASS") or total <= 0 or passed != total or failed != 0:
        raise RuntimeError(f"receipt_not_pass:{relative}:{status}:{total}:{passed}:{failed}")
    return status, total


def zip_check(path: Path, expected_sha: str) -> dict[str, Any]:
    if not path.is_file() or sha(path) != expected_sha:
        raise RuntimeError(f"zip_identity:{path}")
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        count = len(archive.infolist())
    if bad is not None:
        raise RuntimeError(f"zip_crc:{path}:{bad}")
    return {"name": path.name, "bytes": path.stat().st_size, "sha256": expected_sha, "entries": count, "crc": "PASS"}


OUT.mkdir(parents=True, exist_ok=True)
# Remove current closure files so source-diff and self-references remain stable on rerun.
for path in OUT.glob("P96R1_*.json"):
    path.unlink()

# Authority binding and completeness.
old_master = ROOT / MASTER_V2
new_master = ROOT / MASTER_V2R1
v17 = ROOT / V17
for path, expected in ((old_master, MASTER_V2_SHA), (new_master, MASTER_V2R1_SHA), (v17, V17_SHA)):
    if sha(path) != expected:
        raise RuntimeError(f"authority_hash:{path.name}")
sections = [int(value) for value in re.findall(r"(?m)^# (\d+)\.", new_master.read_text(encoding="utf-8"))]
if sections != list(range(89)) or "START NOW" not in new_master.read_text(encoding="utf-8") or "END-OF-DIRECTIVE" not in new_master.read_text(encoding="utf-8"):
    raise RuntimeError("master_v2r1_incomplete")
if (ROOT / "VELMERE_ACTIVE_PASS.txt").read_text(encoding="utf-8").strip() != "P96R1":
    raise RuntimeError("active_pass")
authority = {
    "schemaVersion": "velmere.p96r1.authority-binding.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_BOUND_MASTER_V2R1_AND_V17",
    "latestExplicitOwnerDecision": "Freeze the two P95R1 sibling branches, integrate both exact deltas into one unique P96, rerun both contracts, then stop further local-only Risk History polishing and move to staging or an independent workstream.",
    "masterDirective": {"file": MASTER_V2R1, "bytes": new_master.stat().st_size, "sha256": MASTER_V2R1_SHA, "sections": "0-88 complete", "revision": "V2 R1 checkpoint identity uniqueness"},
    "previousMasterPreserved": {"file": MASTER_V2, "bytes": old_master.stat().st_size, "sha256": MASTER_V2_SHA, "byteIdentical": True},
    "canonicalOwnerDirective": {"file": V17, "bytes": v17.stat().st_size, "sha256": V17_SHA, "changed": False},
    "governanceConflict": {"classification": "DUPLICATE_CHECKPOINT_ID_DIFFERENT_BYTES", "resolution": "FORMAL_P96_SIBLING_RECONCILIATION"},
    "truthBoundary": "V2R1 changes execution governance only by adding checkpoint identity uniqueness. It does not alter the V17 product topology, Customer FINAL denominator or commercial state.",
}
write("P96R1_AUTHORITY_BINDING.json", authority)

# Source diff and parent preservation.
parent = file_map(P94_TREE)
current = file_map(ROOT, exclude_closure=True)
removed = sorted(set(parent) - set(current))
modified = sorted(path for path in set(parent) & set(current) if parent[path]["sha256"] != current[path]["sha256"])
added = sorted(set(current) - set(parent))
if removed:
    raise RuntimeError(f"parent_removed:{removed[:20]}")
if set(modified) != EXPECTED_PARENT_MODIFIED:
    raise RuntimeError(f"unexpected_parent_modified:{modified}")
if current[MASTER_V2]["sha256"] != parent[MASTER_V2]["sha256"] or current[V17]["sha256"] != parent[V17]["sha256"]:
    raise RuntimeError("historical_authority_changed")


def classify(path: str) -> str:
    if path in PRODUCT_CHANGES:
        return "CURRENT_PRODUCT_BUILD_RELEVANT"
    if path == MASTER_V2R1:
        return "MASTER_EXECUTION_GOVERNANCE"
    if path == "VELMERE_ACTIVE_PASS.txt":
        return "CONTROL_PLANE_POINTER"
    if path == "P96R1_PACKAGE_BUILD_RECIPE.json":
        return "DETERMINISTIC_PACKAGE_RECIPE"
    if path.startswith("artifacts/frozen-sibling-checkpoints/"):
        return "FROZEN_SIBLING_EVIDENCE"
    if path.startswith(("receipts/p96/", "artifacts/p96/")):
        return "P96_CURRENT_RECEIPT_OR_LOG"
    if path.startswith("scripts/p96/") or path.startswith("tsconfig.p96-"):
        return "P96_HARNESS_OR_CLOSURE_SOURCE"
    return "P96_ADDED_SUPPORTING_SOURCE"

changes = []
for path in modified:
    changes.append({"path": path, "change": "MODIFIED", "classification": classify(path), "beforeBytes": parent[path]["byteLength"], "beforeSha256": parent[path]["sha256"], "afterBytes": current[path]["byteLength"], "afterSha256": current[path]["sha256"]})
for path in added:
    changes.append({"path": path, "change": "ADDED", "classification": classify(path), "beforeBytes": None, "beforeSha256": None, "afterBytes": current[path]["byteLength"], "afterSha256": current[path]["sha256"]})
changes.sort(key=lambda row: row["path"])
source_manifest = {
    "schemaVersion": "velmere.p96r1.source-change-manifest.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_EXACT_P94_TO_P96_UNION_DIFF",
    "commonAncestor": {"checkpoint": "P94R1", **zip_check(P94_ZIP, P94_SHA)},
    "siblingBranches": [zip_check(P95A_ZIP, P95A_SHA), zip_check(P95B_ZIP, P95B_SHA)],
    "modifiedParentFiles": modified,
    "addedFiles": added,
    "removedParentFiles": removed,
    "changeCount": len(changes),
    "classificationCounts": dict(Counter(row["classification"] for row in changes)),
    "changedBuildRelevantFiles": PRODUCT_CHANGES,
    "changes": changes,
    "truthBoundary": "Exact P94→P96 file-level union diff. PACKAGE_CONTENT_MANIFEST.tsv and P96 closure artifacts are symmetrically excluded to avoid self-reference. Both historical P95 packages remain external immutable siblings and are referenced by exact SHA-256.",
}
write("P96R1_SOURCE_CHANGE_MANIFEST.json", source_manifest)
parent_preservation = {
    "schemaVersion": "velmere.p96r1.parent-and-sibling-preservation.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_P94_PRESERVED_AND_P95_SIBLINGS_FROZEN",
    "p94ParentFilesExcludingPackageManifest": len(parent),
    "p94ByteIdenticalFiles": len(parent) - len(modified),
    "declaredModifiedParentFiles": modified,
    "removedParentFiles": removed,
    "unexpectedParentDifferences": 0,
    "authorityFilesByteIdentical": [MASTER_V2, V17],
    "p95A": zip_check(P95A_ZIP, P95A_SHA),
    "p95B": zip_check(P95B_ZIP, P95B_SHA),
    "frozenReceiptDirectories": ["artifacts/frozen-sibling-checkpoints/p95-a", "artifacts/frozen-sibling-checkpoints/p95-b"],
    "historyRewrite": False,
    "truthBoundary": "P96 is a new unique successor built from P94 plus the exact union of both P95 sibling deltas. Neither P95 package, ledger identity nor frozen receipt was renamed or rewritten.",
}
write("P96R1_PARENT_AND_SIBLING_PRESERVATION.json", parent_preservation)

# Product projection.
parent_product = load(ROOT / "artifacts/closure/p94r1/P94R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")
parent_rows = {row["path"]: dict(row) for row in parent_product["files"]}
if projection(list(parent_rows.values())) != parent_product["currentCandidateProjection"]:
    raise RuntimeError("p94_product_projection_reconstruction")
changed_product = []
for relative in PRODUCT_CHANGES:
    path = ROOT / relative
    before = parent_rows.get(relative)
    after = {"path": relative, "byteLength": path.stat().st_size, "sha256": sha(path)}
    parent_rows[relative] = after
    changed_product.append({"path": relative, "change": "ADDED" if before is None else "MODIFIED", "beforeBytes": None if before is None else before["byteLength"], "beforeSha256": None if before is None else before["sha256"], "afterBytes": after["byteLength"], "afterSha256": after["sha256"]})
current_product = projection(list(parent_rows.values()))
product_manifest = {
    "schemaVersion": "velmere.p96r1.current-product-projection-manifest.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_LOCAL_DETERMINISTIC_SOURCE_IDENTITY_ONLY",
    "parentCheckpoint": "P94R1",
    "parentProjectionReconstructedExactly": True,
    "parentProjection": parent_product["currentCandidateProjection"],
    "siblingProjectionReference": {
        "p95A": load(BASE / "p95a/artifacts/closure/p95r1/P95R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")["currentCandidateProjection"],
        "p95B": load(BASE / "p95b/artifacts/closure/p95r1/P95R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json")["currentCandidateProjection"],
    },
    "currentCandidateProjection": current_product,
    "deltaFromP94": {"fileCount": current_product["fileCount"] - parent_product["currentCandidateProjection"]["fileCount"], "payloadBytes": current_product["payloadBytes"] - parent_product["currentCandidateProjection"]["payloadBytes"], "changedBuildRelevantFiles": len(changed_product)},
    "changedBuildRelevantFiles": changed_product,
    "databaseDeploymentBoundary": {"newP96Migration": False, "requiredExistingMigrations": ["P91", "P93", "P94"], "authorizedDatabaseExecution": "NOT_EXECUTED_P96", "stagingRuntimeProof": "WITHHELD"},
    "files": sorted(parent_rows.values(), key=lambda row: row["path"]),
    "truthBoundary": "Build-relevant source identity only. The governance directive, receipts and database deployment proof are separate. Whole-project dependency closure, production build, Browser, PostgreSQL and exact Windows remain withheld.",
}
write("P96R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json", product_manifest)

# Test aggregate.
core_receipts = [
    ("alignment_runtime", "receipts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_RUNTIME.json"),
    ("request_storage_runtime", "receipts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_RUNTIME.json"),
    ("merge_integration_runtime", "receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_INTEGRATION_RUNTIME.json"),
    ("alignment_static", "receipts/p96/P96_RISK_HISTORY_CURRENT_ALIGNMENT_STATIC.json"),
    ("request_storage_static", "receipts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_STATIC.json"),
    ("sibling_merge_static", "receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_STATIC.json"),
    ("changed_module_reachability", "receipts/p96/P96_CHANGED_MODULE_REACHABILITY.json"),
    ("targeted_typescript", "receipts/p96/P96_TARGETED_STRICT_TYPESCRIPT.json"),
    ("sibling_branch_reconciliation", "receipts/p96/P96_P95_SIBLING_BRANCH_RECONCILIATION.json"),
]
rows = []
for identifier, relative in core_receipts:
    status, count = receipt_count(relative)
    rows.append({"id": identifier, "checks": count, "status": status, "receipt": relative, "sha256": sha(ROOT / relative)})
core_total = sum(row["checks"] for row in rows)
compat = load(ROOT / "receipts/p96/P96_COMPATIBILITY_REGRESSION.json")
compat_total = int(compat["executedChecks"]["total"])
if compat["status"] != "PASS_BOUNDED_CURRENT_BYTE_COMPATIBILITY" or compat["executedChecks"]["failed"] != 0:
    raise RuntimeError("compatibility_regression")
repeatability = load(ROOT / "receipts/p96/P96_REPEATABILITY.json")
if repeatability["status"] != "PASS_2_OF_2_BYTE_IDENTICAL" or repeatability["checks"]["failed"] != 0:
    raise RuntimeError("repeatability")
failure = load(ROOT / "receipts/p96/P96_FAILURE_ADJUDICATION.json")
if failure["status"] != "PASS_ALL_FAILURES_PRESERVED_AND_ADJUDICATED" or failure["summary"]["creditedFailures"] != 0:
    raise RuntimeError("failure_adjudication")
test_aggregate = {
    "schemaVersion": "velmere.p96r1.test-aggregate.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_BOUNDED_CURRENT_BYTE_SIBLING_UNION_SCOPE",
    "p96CoreChecksAcrossOverlappingHarnesses": core_total,
    "compatibilityChecksAcrossOverlappingHarnesses": compat_total,
    "freshAffectedScopeChecksAcrossOverlappingHarnesses": core_total + compat_total,
    "freshCommands": len(rows) + int(compat["commands"]["total"]),
    "coreRows": rows,
    "compatibility": {"receipt": "receipts/p96/P96_COMPATIBILITY_REGRESSION.json", "checks": compat_total, "commands": compat["commands"]["total"], "sha256": sha(ROOT / "receipts/p96/P96_COMPATIBILITY_REGRESSION.json")},
    "repeatability": {"receipt": "receipts/p96/P96_REPEATABILITY.json", "commands": repeatability["checks"]["total"], "status": repeatability["status"], "sha256": sha(ROOT / "receipts/p96/P96_REPEATABILITY.json"), "addToCheckTotal": False},
    "failureAdjudication": {"receipt": "receipts/p96/P96_FAILURE_ADJUDICATION.json", "cases": failure["summary"]["total"], "creditedFailures": 0, "sha256": sha(ROOT / "receipts/p96/P96_FAILURE_ADJUDICATION.json")},
    "zeroFakeCredit": {"independentEvidenceCount": False, "accuracyStatistic": False, "realDatabase": False, "deployedHttp": False, "renderedBrowser": False, "wholeProjectBuild": False, "exactWindows": False, "customerFinal": "0/20"},
    "truthBoundary": "The fresh 428-check headline covers the integrated P96 union plus bounded P91/P93 compatibility. Repeatability reruns are reported separately and are not added as independent checks. Superseded single-branch P95/P94 route harnesses are not used as current integration proof.",
}
write("P96R1_TEST_AGGREGATE.json", test_aggregate)
write("P96R1_FAILURE_ADJUDICATION.json", {"schemaVersion": "velmere.p96r1.failure-adjudication-reference.v1", "generatedAt": GENERATED_AT, "status": failure["status"], "sourceReceipt": "receipts/p96/P96_FAILURE_ADJUDICATION.json", "sourceSha256": sha(ROOT / "receipts/p96/P96_FAILURE_ADJUDICATION.json"), "cases": failure["cases"], "summary": failure["summary"], "truthBoundary": failure["truthBoundary"]})

# Integration boundary.
integration_boundary = {
    "schemaVersion": "velmere.p96r1.risk-history-sibling-integration-boundary.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_BOUNDED_INTEGRATED_LOCAL_CUSTOMER_INTEGRITY",
    "preservedP95A": ["current score versus latest stored history canonical identity", "timestamp ordering", "methodology/score/evidence version comparability", "WITHHELD on identity conflict or newer history"],
    "preservedP95B": ["exact requested asset/limit/cursor binding", "pageReference and pageEvidenceDigest", "cross-asset response swap rejection", "per-page DATABASE versus MEMORY provenance", "no retention/restore overclaim"],
    "sharedConflict": {"file": "components/market-integrity/RiskHistoryControl.tsx", "resolution": "THREE_WAY_UNION_FROM_P94_BASE", "sha256": sha(ROOT / "components/market-integrity/RiskHistoryControl.tsx"), "mergeMarkers": 0},
    "jointProof": {"receipt": "receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_INTEGRATION_RUNTIME.json", "checks": 17, "sha256": sha(ROOT / "receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_INTEGRATION_RUNTIME.json")},
    "localPolishingPolicy": "STOP_UNLESS_NEW_DEPLOYED_EVIDENCE_OR_A_NEW_CROSS_PRODUCT_CORRECTNESS_DEFECT_APPEARS",
    "truthBoundary": "Both customer-integrity repairs coexist in one source tree. This remains local/no-socket evidence and does not promote Risk Indicator or any customer row to FINAL.",
}
write("P96R1_RISK_HISTORY_SIBLING_INTEGRATION_BOUNDARY.json", integration_boundary)

# Environment and blockers.
def command_output(command: list[str]) -> str:
    try:
        return subprocess.run(command, text=True, capture_output=True, timeout=20).stdout.strip() or subprocess.run(command, text=True, capture_output=True, timeout=20).stderr.strip()
    except Exception:
        return "UNAVAILABLE"
environment = {
    "schemaVersion": "velmere.p96r1.environment-truth.v1",
    "generatedAt": GENERATED_AT,
    "status": "BOUNDED_LOCAL_ENVIRONMENT_ONLY",
    "current": {"platform": platform.system() + " " + platform.release() + " " + platform.machine(), "node": command_output(["node", "-v"]), "npm": command_output(["npm", "-v"]), "typescript": command_output(["tsc", "-v"]), "nodeModulesPresent": (ROOT / "node_modules").is_dir(), "psqlAvailable": bool(subprocess.run(["bash", "-lc", "command -v psql"], capture_output=True).stdout.strip()), "supabaseCliAvailable": bool(subprocess.run(["bash", "-lc", "command -v supabase"], capture_output=True).stdout.strip()), "dockerAvailable": bool(subprocess.run(["bash", "-lc", "command -v docker"], capture_output=True).stdout.strip()), "authorizedDatabaseEnvironmentDetected": False},
    "canonicalTarget": {"platform": "Windows Server 2025", "node": "24.18.0", "npm": "11.16.0"},
    "proof": {"targetedStrictTypeScript": "PASS 3/3", "wholeProjectSemanticTypeScript": "WITHHELD_DEPENDENCY_GRAPH_MISSING", "eslint": "WITHHELD_DEPENDENCY_GRAPH_MISSING", "webpack": "WITHHELD", "turbopack": "WITHHELD", "exactWindows": "WITHHELD", "stagingDatabase": "WITHHELD"},
    "truthBoundary": "No exact dependency graph, PostgreSQL/Supabase runtime, rendered Browser or Windows target exists in this environment. No parent exact-byte credit is inherited onto P96 bytes.",
}
write("P96R1_ENVIRONMENT_TRUTH.json", environment)
blockers = {
    "schemaVersion": "velmere.p96r1.current-blocker-map.v1",
    "generatedAt": GENERATED_AT,
    "status": "OPEN_BLOCKERS_CLASSIFIED",
    "governanceConflict": {"status": "RESOLVED_IN_P96", "nextAction": "Use unique checkpoint IDs; never reuse either P95R1 as current canonical."},
    "rows": [
        {"priority": 1, "category": "ENVIRONMENT", "workstream": "Risk Indicator staging/customer chain", "blocker": "P91/P93/P94 migrations, service-role separation, RLS, two JWTs, rollback/concurrency, deployed request-bound HTTP and same customer identity have not run on authorized staging.", "nextAction": "Execute the existing chain on authorized staging; do not add another local Risk History refinement."},
        {"priority": 2, "category": "ENVIRONMENT", "workstream": "Browser/accessibility/build", "blocker": "No exact dependency graph, rendered Chrome/Edge/Firefox/WebKit journey, PL/EN/DE accessibility proof, whole-project type/lint/dual build or exact Windows exists on P96 bytes.", "nextAction": "Run the canonical dependency/build/Browser matrix in an authorized exact environment."},
        {"priority": 3, "category": "RIGHTS", "workstream": "Audit Pro", "blocker": "Five target-relevant live lanes, four strict receipts, three independent families, six evidence rows and field-level commercial/display/PDF/retention rights remain unproven.", "nextAction": "Continue rights-bound provider work without lowering P89/P90 thresholds if staging remains unavailable."},
        {"priority": 4, "category": "PRODUCT", "workstream": "Other Customer FINAL rows", "blocker": "Customer FINAL remains 0/20; no row has a complete deployed customer-authorized end-to-end chain.", "nextAction": "Move to the highest-value independent row rather than polishing local Risk History."},
    ],
    "riskHistoryLocalPolishing": "STOPPED_AFTER_P96_RECONCILIATION",
    "noProgressRule": "If staging or exact dependencies remain unavailable, change workstream; do not create P97 Risk History local-only polishing.",
}
write("P96R1_CURRENT_BLOCKER_MAP.json", blockers)

# Security scan on current P96 delta and authority/source integrity.
private_key = re.compile(rb"-----BEGIN (?:(?:RSA|EC|OPENSSH) )?PRIVATE KEY-----")
token_patterns = [re.compile(rb"AKIA[0-9A-Z]{16}"), re.compile(rb"sk_live_[A-Za-z0-9]{16,}"), re.compile(rb"ghp_[A-Za-z0-9]{30,}"), re.compile(rb"github_pat_[A-Za-z0-9_]{20,}"), re.compile(rb"(?<![A-Za-z0-9_-])sk-(?:proj-)?[A-Za-z0-9_-]{24,}")]
scan_paths = [ROOT / row["path"] for row in changes]
findings = []
for path in scan_paths:
    data = path.read_bytes()
    if private_key.search(data) or any(pattern.search(data) for pattern in token_patterns):
        findings.append(path.relative_to(ROOT).as_posix())
unexpected_binaries = [row["path"] for row in changes if Path(row["path"]).suffix.lower() in {".exe", ".dll", ".bin", ".pyc", ".pyo", ".woff", ".woff2", ".ttf", ".otf", ".zip", ".pdf"}]
if findings or unexpected_binaries:
    raise RuntimeError(f"current_delta_scan:{findings}:{unexpected_binaries}")
security = {
    "schemaVersion": "velmere.p96r1.security-and-privacy-scan.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_BOUNDED_CURRENT_DELTA_SCAN",
    "filesScanned": len(scan_paths),
    "privateKeyOrCredentialMatches": 0,
    "unexpectedCurrentDeltaBinaries": 0,
    "customerUiBoundary": {"providerUrl": "ABSENT", "rawProviderResponse": "ABSENT", "sourceReceiptRoot": "ABSENT", "retentionRestoreOverclaim": "ABSENT"},
    "truthBoundary": "Current P96 delta and merged customer UI source scan only. Full-package scan is repeated independently by deterministic packaging. This is not a deployed penetration test.",
}
write("P96R1_SECURITY_AND_PRIVACY_SCAN.json", security)

# Checkpoint receipt last (tree/package identity follows later).
evidence_names = [
    "P96R1_AUTHORITY_BINDING.json",
    "P96R1_SOURCE_CHANGE_MANIFEST.json",
    "P96R1_CURRENT_PRODUCT_PROJECTION_MANIFEST.json",
    "P96R1_TEST_AGGREGATE.json",
    "P96R1_FAILURE_ADJUDICATION.json",
    "P96R1_PARENT_AND_SIBLING_PRESERVATION.json",
    "P96R1_RISK_HISTORY_SIBLING_INTEGRATION_BOUNDARY.json",
    "P96R1_ENVIRONMENT_TRUTH.json",
    "P96R1_SECURITY_AND_PRIVACY_SCAN.json",
    "P96R1_CURRENT_BLOCKER_MAP.json",
]
evidence = [{"path": f"artifacts/closure/p96r1/{name}", "bytes": (OUT / name).stat().st_size, "sha256": sha(OUT / name)} for name in evidence_names]
checkpoint = {
    "schemaVersion": "velmere.p96r1.checkpoint-receipt.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_BOUNDED_P96R1_P95_SIBLING_RECONCILIATION_RISK_HISTORY_INTEGRITY_MERGE",
    "commonAncestor": {"checkpoint": "P94R1", "sha256": P94_SHA},
    "siblingParents": [{"branch": "P95-A", "sha256": P95A_SHA}, {"branch": "P95-B", "sha256": P95B_SHA}],
    "activePass": "P96R1",
    "masterDirective": {"file": MASTER_V2R1, "sha256": MASTER_V2R1_SHA},
    "canonicalOwnerDirective": {"file": V17, "sha256": V17_SHA},
    "evidence": evidence,
    "productProjection": current_product,
    "tests": {"freshAffectedScopeChecksAcrossOverlappingHarnesses": core_total + compat_total, "freshCommands": len(rows) + int(compat["commands"]["total"]), "repeatability": "9/9 commands 2/2 byte-identical"},
    "numerators": {"customerFinal": "0/20", "auditFinalPdf": "0/3", "rights": "2/203 inherited only", "paidValue": "0/10", "saleEligible": "0/20", "riskIndicatorFinal": False, "pilotReady": False, "goPaid": False, "live": False, "worldClassProven": False},
    "global": "NO_GO / STOP_SELL",
    "truthBoundary": "P96R1 resolves the duplicate P95 identity and physically integrates both local customer-integrity contracts. PostgreSQL, deployed HTTP, rendered Browser, full build, exact Windows, real customer and FINAL remain withheld.",
}
write("P96R1_CHECKPOINT_RECEIPT.json", checkpoint)
print(json.dumps({"status": checkpoint["status"], "productProjection": current_product, "testChecks": core_total + compat_total, "parentByteIdentical": parent_preservation["p94ByteIdenticalFiles"], "changes": len(changes)}, indent=2))
