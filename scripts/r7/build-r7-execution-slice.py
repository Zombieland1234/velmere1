#!/usr/bin/env python3
from __future__ import annotations
from collections import deque
from pathlib import Path
import hashlib
import json
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / "r7-execution-slice"
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

# Product/runtime directories are copied whole. Large historical evidence/config trees
# are admitted only when directly bound by the 52-test graph or explicit merge proof.
WHOLE_DIRS = [
    ".github", "app", "components", "lib", "public", "messages", "data", "db",
    "fixtures", "store", "tests", "supabase",
    "scripts/current-execution", "scripts/pass11", "scripts/pass13", "scripts/deployment", "scripts/r7",
]
BASE_FILES = [
    "package.json", "package-lock.json", ".npmrc", ".nvmrc", ".node-version",
    ".gitignore", ".gitattributes", "next.config.mjs", "next-env.d.ts",
    "eslint.config.mjs", "postcss.config.js", "tailwind.config.ts", "tsconfig.json",
    "i18n.ts", "proxy.ts", "vercel.json", "playwright.config.ts",
    "ENV_PRODUCTION_READY.example", "components.json", "instrumentation.ts",
    "instrumentation-client.ts", "middleware.ts",
    "VELMERE_CANONICAL_OWNER_DIRECTIVE_V17_TRUE_TOPOLOGY_AUTOMATED_ADVANCED_CURRENT_WORLD_CLASS_2026-08-17.txt",
    "VELMERE_P101R1_ZERO_EURO_FULL_PRODUCT_ACTIVATION_20_OF_20_AI_VALIDATION_MASTER_OVERRIDE_V4_2026-08-21.txt",
    "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt",
    "VELMERE_R7_INTERNAL_CUSTOMER_FINAL_AUTHORITY_RECONCILIATION_2026-08-24.txt",
]
EVIDENCE_FILES = [
    "artifacts/r5/VELMERE_R5_20_ROW_PROGRESS.json",
    "artifacts/r5/VELMERE_R5_MARKET_IMPACT_CUSTOMER_OWNED_EVIDENCE_RECEIPT.json",
    "artifacts/r5/VELMERE_R5_CUSTOMER_OWNED_MARKET_EVIDENCE_BOUNDARY.json",
    "artifacts/r6/VELMERE_R6_20_ROW_PROGRESS.json",
    "artifacts/r6/VELMERE_R6_EXACT_PGLITE_PREPARATION.json",
    "artifacts/r6/VELMERE_R6_EXACT_WINDOWS_WORKFLOW_CONTRACT.json",
    "artifacts/r7/staging/R7_COMMON_STAGING_RUNTIME_RECEIPT_PRE_WINDOWS_V3.json",
    "artifacts/r7/VELMERE_R7_ANCESTRY_AND_MERGE_PLAN.json",
    "artifacts/r7/VELMERE_R7_THREE_WAY_MERGE_RECEIPT.json",
    "artifacts/r7/VELMERE_R7_FULL_SOURCE_IDENTITY.json",
    # Runtime-imported, byte-checked ECB usage authority.  Keep this exact
    # receipt in the execution slice: Browser rights must be established
    # before any provider network call, and production compilation resolves
    # the JSON import from both compliance and search delivery modules.
    "artifacts/r7/providers/R7_ECB_USAGE_POLICY_REVIEW_20260824.json",
    "docs/current-handoff/post-p101-v4-audit/CURRENT_CANDIDATE_EVIDENCE_SUMMARY.json",
    "docs/current-handoff/post-p101-v4-audit/V4_AI_CAMPAIGNS_VERIFY.json",
]
# Frozen R5/R6 ancestry tooling that was present in the validated R7 v3
# projection.  Keep this list in current source: the prior builder depended on
# an out-of-tree receipts/R7_THREE_WAY_CLASSIFICATION.json file, so the exact
# execution slice could not be rebuilt from SOURCE_ONLY alone.
ANCESTRY_FILES = [
    "P101R1_R5_PACKAGE_BUILD_RECIPE.json",
    "P101R1_R6_PACKAGE_BUILD_RECIPE.json",
    "scripts/r5/audit-r5-exact-dependency-source-closure.mjs",
    "scripts/r5/build-r5-deterministic-package.py",
    "scripts/r5/compare-r5-campaign-runs.mjs",
    "scripts/r5/generate-r5-progress-artifacts.py",
    "scripts/r5/generate-r5-source-delta.py",
    "scripts/r5/verify-r5-customer-owned-market-evidence-boundary.mjs",
    "scripts/r5/verify-r5-test-only-shim-boundary.mjs",
    "scripts/r6/build-r6-deterministic-package.py",
    "scripts/r6/build-r6-repeatability.py",
    "scripts/r6/generate-r6-progress-artifacts.py",
    "scripts/r6/generate-r6-source-delta.py",
    "scripts/r6/prepare-exact-pglite.py",
    "scripts/r6/run-r6-isolated-current-execution-campaign.py",
    "scripts/r6/validate-r6-artifacts.py",
    "scripts/r6/verify-r6-exact-windows-workflow.py",
]
R7_FILES = [
    "config/r7/r7-20-row-progress.json",
    "config/r7/r7-authority-reconciliation-receipt.json",
    "config/r7/r7-internal-customer-final-authority.json",
    "config/r7/r7-staging-foundation-contract.json",
    "config/r7/r7-browser-basic-e2e-contract.json",
    "docs/authority/VELMERE_R7_INTERNAL_CUSTOMER_FINAL_AUTHORITY_RECONCILIATION_2026-08-24.md",
    "scripts/pass36/test-a102r11-client-pdf-blob-boundary.ts",
]
EXCLUDED_TOP = {
    ".git", "node_modules", ".next", ".velmere", "receipts", "_velmere",
    "evaluation", "current-execution-out", "P51_NATIVE_WINDOWS_EXACT_BUNDLE_PROJECTION",
    "p65-windows",
}
EXCLUDED_NAMES = {
    "CURRENT_SOURCE_MANIFEST.tsv", "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv",
    "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json",
    "R7_EXECUTION_SLICE_MANIFEST.json", "R7_EXECUTION_SLICE_MANIFEST.tsv",
    "PACKAGE_CONTENT_MANIFEST.tsv", "VELMERE_R5_CURRENT_SOURCE_MANIFEST.tsv",
}
TEXT_SUFFIXES = {".ts", ".tsx", ".mts", ".mjs", ".js", ".cjs", ".json", ".sql", ".md", ".txt", ".yml", ".yaml", ".py", ".ps1", ".toml"}
RESOLVE_SUFFIXES = ["", ".ts", ".tsx", ".mts", ".mjs", ".js", ".cjs", ".json", ".sql", ".md", ".txt", ".yml", ".yaml", ".py", ".ps1"]
IMPORT_RE = re.compile(r'''(?:from\s*|import\s*\(|require\s*\()\s*["']([^"']+)["']''')
STRING_RE = re.compile(r'''["']([^"'\n]{3,320})["']''')

selected: set[str] = set()
queue: deque[str] = deque()
parsed: set[str] = set()

def admissible(rel: str) -> bool:
    rel = rel.replace("\\", "/")
    while rel.startswith("./"):
        rel = rel[2:]
    rel = rel.lstrip("/")
    if not rel or rel in EXCLUDED_NAMES:
        return False
    parts = Path(rel).parts
    if "__pycache__" in parts or rel.endswith((".pyc", ".pyo")):
        return False
    top = rel.split("/", 1)[0]
    if top in EXCLUDED_TOP:
        return rel in EVIDENCE_FILES or rel.startswith("artifacts/r7/")
    if top == "artifacts":
        return rel in EVIDENCE_FILES
    return True

def add(rel: str) -> bool:
    rel = rel.replace("\\", "/")
    while rel.startswith("./"):
        rel = rel[2:]
    rel = rel.lstrip("/")
    if not admissible(rel):
        return False
    p = ROOT / rel
    if not p.is_file() or rel in selected:
        return False
    selected.add(rel)
    if p.suffix.lower() in TEXT_SUFFIXES and p.stat().st_size <= 6_000_000:
        queue.append(rel)
    return True

def add_dir(rel: str) -> None:
    d = ROOT / rel
    if not d.is_dir():
        return
    for p in sorted(d.rglob("*")):
        if p.is_file():
            add(p.relative_to(ROOT).as_posix())

for d in WHOLE_DIRS:
    add_dir(d)
for f in BASE_FILES + EVIDENCE_FILES + ANCESTRY_FILES + R7_FILES:
    add(f)
for p in ROOT.glob("tsconfig*.json"):
    add(p.name)

# package scripts are execution dependencies even when not imported.
package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
for script_name in ["build", "typecheck", "lint", "check:i18n", "vercel:preflight"]:
    command = package.get("scripts", {}).get(script_name, "")
    for match in re.findall(r"(?:^|\s)(scripts/[A-Za-z0-9_./-]+\.(?:mjs|mts|ts|js|cjs|py|ps1))", command):
        add(match)

def resolve_import(spec: str, source: Path) -> list[Path]:
    if spec.startswith("@/"):
        base = ROOT / spec[2:]
    elif spec.startswith("."):
        base = (source.parent / spec).resolve()
        try:
            base.relative_to(ROOT)
        except ValueError:
            return []
    else:
        return []
    candidates = [Path(str(base) + suffix) for suffix in RESOLVE_SUFFIXES]
    candidates.extend(base / name for name in ["index.ts", "index.tsx", "index.mts", "index.mjs", "index.js", "index.json"])
    return candidates

def root_literal(value: str) -> str | None:
    value = value.replace("\\", "/").strip()
    while value.startswith("./"):
        value = value[2:]
    value = value.lstrip("/")
    if not value or len(value) > 240 or value.startswith(("/", "http:", "https:", "node:", "data:")):
        return None
    if not re.fullmatch(r"[A-Za-z0-9_@.+/\\-]+", value):
        return None
    if "${" in value or "*" in value or ".." in Path(value).parts:
        return None
    if "/" not in value and not re.search(r"\.(?:json|sql|ts|tsx|mjs|mts|js|md|txt|yml|yaml|py|ps1|toml)$", value):
        return None
    return value

# Single-pass queue closure: each file is read at most once.
while queue:
    rel = queue.popleft()
    if rel in parsed:
        continue
    parsed.add(rel)
    p = ROOT / rel
    try:
        text = p.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    for spec in IMPORT_RE.findall(text):
        for candidate in resolve_import(spec, p):
            if candidate.is_file():
                add(candidate.relative_to(ROOT).as_posix())
                break
    # Literal file-path closure is intentionally restricted to executable tests/tooling.
    # Product modules are followed through imports; scanning all prose/config strings there
    # would drag the entire historical pass corpus into the execution slice.
    if rel.startswith(("scripts/", "tests/", ".github/")) or rel in {"package.json", "next.config.mjs", "eslint.config.mjs", "tsconfig.json"}:
        for value in STRING_RE.findall(text):
            literal = root_literal(value)
            if literal and (ROOT / literal).is_file():
                add(literal)

rows: list[dict[str, object]] = []
for rel in sorted(selected):
    src = ROOT / rel
    dst = OUT / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    data = src.read_bytes()
    rows.append({"path": rel, "byteLength": len(data), "sha256": hashlib.sha256(data).hexdigest()})

body = "".join(f"{row['sha256']}\t{row['byteLength']}\t{row['path']}\n" for row in rows).encode()
full_source_identity_path = ROOT / "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json"
full_source_manifest_path = ROOT / "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv"
if not full_source_identity_path.is_file() or not full_source_manifest_path.is_file():
    raise SystemExit("missing current full-source identity; run scripts/r7/build-r7-source-identity.py first")
full_source_identity = json.loads(full_source_identity_path.read_text(encoding="utf-8"))
full_source_manifest_sha256 = hashlib.sha256(full_source_manifest_path.read_bytes()).hexdigest()
if full_source_identity.get("candidate") != "R7_MERGED_CURRENT_SOURCE":
    raise SystemExit("full-source candidate mismatch")
if full_source_identity.get("manifestWithHeaderSha256") != full_source_manifest_sha256:
    raise SystemExit("full-source manifest hash mismatch; regenerate current source identity")
if full_source_identity.get("packageJsonSha256") != hashlib.sha256((OUT / "package.json").read_bytes()).hexdigest():
    raise SystemExit("full-source/package.json binding mismatch")
if full_source_identity.get("packageLockSha256") != hashlib.sha256((OUT / "package-lock.json").read_bytes()).hexdigest():
    raise SystemExit("full-source/package-lock.json binding mismatch")
manifest = {
    "schemaVersion": "velmere.r7.execution-slice-manifest.v3",
    "candidate": "R7_MERGED_CURRENT_SOURCE",
    "fileCount": len(rows),
    "payloadByteLength": sum(int(row["byteLength"]) for row in rows),
    "aggregateIdentitySha256": hashlib.sha256(body).hexdigest(),
    "packageJsonSha256": hashlib.sha256((OUT / "package.json").read_bytes()).hexdigest(),
    "packageLockSha256": hashlib.sha256((OUT / "package-lock.json").read_bytes()).hexdigest(),
    "fullSource": {
        "identityPath": "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json",
        "manifestPath": "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv",
        "fileCount": full_source_identity["fileCount"],
        "payloadByteLength": full_source_identity["totalBytes"],
        "pathSetSha256": full_source_identity["pathSetSha256"],
        "aggregateIdentitySha256": full_source_identity["aggregateIdentitySha256"],
        "manifestWithHeaderSha256": full_source_manifest_sha256,
        "packageJsonSha256": full_source_identity["packageJsonSha256"],
        "packageLockSha256": full_source_identity["packageLockSha256"],
    },
    "ancestry": {"commonBase": "R4", "siblingBranches": ["R5", "R6"]},
    "testDenominator": 52,
    "requiredMaterialPaths": {
        "r5CustomerOwnedMarketImpactTest": "scripts/current-execution/test-customer-owned-market-impact-attested-route.mts",
        "r6AngelDeleteTest": "scripts/current-execution/test-angel-durable-memory-delete-fail-closed.mts",
        "r6PublicProofTest": "scripts/current-execution/test-public-proof-publication-boundary.ts",
        "r6VerifyDurableRegistryTest": "scripts/current-execution/test-v4-verify-durable-registry-boundary.ts",
        "r7AuthorityTest": "scripts/current-execution/test-r7-internal-final-authority-separation.mjs",
        "r7BrowserPolicyTest": "scripts/current-execution/test-r7-browser-basic-account-artifact-policy.mts",
        "r7BrowserPolicyModule": "lib/search/browser-account-artifact-policy.ts",
        "r7ClientPdfBlobBoundaryTest": "scripts/pass36/test-a102r11-client-pdf-blob-boundary.ts",
        "r7AccountCustomerArtifactClientContractTest": "tests/security/a102-account-customer-artifact-client-contract.test.ts",
        "r7BrowserEcbUsagePolicyReceipt": "artifacts/r7/providers/R7_ECB_USAGE_POLICY_REVIEW_20260824.json",
        "r7StagingFoundationMigration": "supabase/migrations/20260824000001_r7_browser_basic_staging_foundation.sql",
        "r7LiveSchemaHardeningMigration": "supabase/migrations/20260824000005_r7_live_schema_reconciliation_and_security_hardening.sql",
        "r7PrivateDenyMigration": "supabase/migrations/20260824000006_r7_private_control_explicit_deny_policies.sql",
        "r7TemporaryMigrationExportCleanup": "supabase/migrations/20260824000007_r7_remove_temporary_migration_corpus_export.sql",
        "r7SourceAuthorityRunAttemptBinding": "supabase/migrations/20260824000008_r7_source_authority_run_attempt_binding.sql",
        "r7SourceAuthorityAppendOnlyHistory": "supabase/migrations/20260825000012_r7_source_authority_append_only_history.sql",
        "r7CampaignRunner": "scripts/r7/run-r7-current-execution-campaign.mjs",
        "r7SuccessorTransportBuilder": "scripts/r7/build-r7-windows-transport.py",
        "r7SuccessorSecretScanner": "scripts/r7/scan-r7-successor-secrets.mjs",
        "r7ExactWindowsWorkflowTemplate": "scripts/r7/templates/r7-final-exact-windows.yml.template",
    },
    "files": rows,
    "archiveAdditionalPaths": [
        "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv",
        "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json",
        "R7_EXECUTION_SLICE_MANIFEST.json",
        "R7_EXECUTION_SLICE_MANIFEST.tsv",
    ],
}
for required in manifest["requiredMaterialPaths"].values():
    if required not in selected:
        raise SystemExit(f"missing required material path: {required}")
(OUT / "R7_EXECUTION_SLICE_MANIFEST.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
(OUT / "R7_EXECUTION_SLICE_MANIFEST.tsv").write_bytes(body)
# Preserve the full-source identity under its canonical names.  The execution
# identity has its own R7_EXECUTION_SLICE_MANIFEST.* namespace; reusing the
# current-source names for a smaller projection made the v3 transport
# internally ambiguous.
shutil.copy2(full_source_manifest_path, OUT / full_source_manifest_path.name)
shutil.copy2(full_source_identity_path, OUT / full_source_identity_path.name)
print(json.dumps({
    **{key: manifest[key] for key in ["fileCount", "payloadByteLength", "aggregateIdentitySha256", "packageJsonSha256", "packageLockSha256", "testDenominator"]},
    "fullSourceAggregateIdentitySha256": manifest["fullSource"]["aggregateIdentitySha256"],
    "fullSourceManifestWithHeaderSha256": manifest["fullSource"]["manifestWithHeaderSha256"],
}, indent=2))
