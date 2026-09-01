#!/usr/bin/env python3
"""Build P38 status, authority, compact V15 ledger, and handoff manifest."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p38"
V15 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
SOURCE_IDENTITY = ART / "source-identity.json"
P37_STATUS = ROOT / "artifacts/closure/p37/P37_STATUS.json"
P37_ANGEL_RISK = ROOT / "artifacts/closure/p37/P37_ANGEL_RISK_SAME_INPUT_EXECUTION.json"
CAS_POLICY = ROOT / "config/p38/p38-current-lockfile-local-cas-policy.json"
CAS_MANIFEST = ROOT / "config/p38/p38-local-cache-import-manifest.json"
CAS_RECEIPT = ART / "P38_CURRENT_LOCKFILE_LOCAL_CAS_RECOVERY.json"
NODE_DIFFERENTIAL = ART / "P38_NODE_MAJOR_DIFFERENTIAL.json"
STATUS = ART / "P38_STATUS.json"
AUTHORITY = ART / "CURRENT_AUTHORITY_P38.json"
LEDGER = ART / "VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P38_V15_2026-08-14.txt"
HANDOFF = ART / "P38_HANDOFF_MANIFEST.json"

REVISION = "P38_V15_CURRENT_LOCKFILE_CAS_RECOVERY_AND_NODE24_DIFFERENTIAL"
EXPECTED_V15_SHA256 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
P37_SOURCE_AGGREGATE = "cb460d6968d7455057bf319cae25bf1e8b63869d6bdaf15b70c3eed051a31563"
CURRENT_LOCK_SHA256 = "e228adec08801e454ef5559a20f302110b4896a307c364195716218a376c48bb"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def write_integrity_json(path: Path, payload: dict[str, Any]) -> None:
    payload["integritySha256"] = sha256_bytes(canonical_json(payload))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"object_required:{path}")
    return value


def file_binding(path: Path) -> dict[str, Any]:
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "byteLength": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def table(headers: list[str], rows: list[list[str]]) -> str:
    def clean(value: str) -> str:
        return value.replace("|", "\\|").replace("\n", " ")
    output = [
        "| " + " | ".join(clean(value) for value in headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    output.extend("| " + " | ".join(clean(value) for value in row) + " |" for row in rows)
    return "\n".join(output)


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    if sha256_file(V15) != EXPECTED_V15_SHA256:
        raise RuntimeError("v15_changed")

    source = load(SOURCE_IDENTITY)
    p37 = load(P37_STATUS)
    angel_risk = load(P37_ANGEL_RISK)
    cas_policy = load(CAS_POLICY)
    cas_manifest = load(CAS_MANIFEST)
    cas = load(CAS_RECEIPT)
    node_diff = load(NODE_DIFFERENTIAL)

    if source.get("requiredAuthorityBinding", {}).get("sha256") != EXPECTED_V15_SHA256:
        raise RuntimeError("v15_not_bound_to_p38_source")
    if source.get("parentSourceAggregateSha256") != P37_SOURCE_AGGREGATE:
        raise RuntimeError("p37_parent_source_not_bound")
    if cas.get("combinedExactCoverage") != "67/661" or cas.get("recoveredTarballs") != 26:
        raise RuntimeError("cas_recovery_not_complete")
    if cas.get("networkRequestsExecuted") != 0 or cas.get("dependencyClosure") is not False:
        raise RuntimeError("cas_truth_boundary_failed")
    summary = node_diff.get("summary", {})
    if summary.get("node24LinePassed") != "6/6" or summary.get("crossRuntimeRuntimeByteParity") != "6/6":
        raise RuntimeError("node_differential_not_complete")
    if summary.get("exactNode24180Executed") is not False or summary.get("exactWindowsExecuted") is not False:
        raise RuntimeError("node_differential_false_promotion")
    if angel_risk.get("summary", {}).get("profilesCompletedSameInput") != 6:
        raise RuntimeError("p37_angel_risk_boundary_missing")

    core_products = ["Audit", "Real Markets", "Shield", "Shield Pro", "Browser/PDF"]
    tiers = ["Basic", "Pro", "Advanced"]
    node_family_by_product = {
        "Audit": "A82 22/24-line fixture parity",
        "Real Markets": "A86 22/24-line fixture parity",
        "Shield": "A84 22/24-line fixture parity",
        "Shield Pro": "A85 temp-current-binding 22/24-line fixture parity",
        "Browser/PDF": "No final Browser/PDF execution in P38",
    }

    closure_rows: list[dict[str, Any]] = []
    for product in core_products:
        for tier in tiers:
            closure_rows.append({
                "product": product,
                "tier": tier,
                "previousPercent": 0,
                "currentPercent": 0,
                "deltaPercentagePoints": 0,
                "scoreState": "V15_CURRENT_PRODUCT_CLOSURE_SCORE_UNCHANGED",
                "currentInternalEvidence": node_family_by_product[product],
                "reason": (
                    "P38 improved current dependency artifact coverage and Node-24-line fixture compatibility, but did not "
                    "execute exact Node 24.18.0 on Windows, final same-input customer outputs, field-level legal data, "
                    "accuracy/value validation, Browser/PDF release evidence, or three convergence rounds."
                ),
            })

    status: dict[str, Any] = {
        "schemaVersion": "velmere.p38.status.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T03:32:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "parentCheckpoint": "P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING",
        "ownerDirective": file_binding(V15),
        "sourceIdentity": {
            "fileCount": source["fileCount"],
            "payloadBytes": source["payloadBytes"],
            "pathSetSha256": source["pathSetSha256"],
            "sourceAggregateSha256": source["sourceAggregateSha256"],
            "publicPems": source["publicPemPolicy"]["allowedPublicPemCount"],
        },
        "completedThisPass": {
            "currentPackageLockBound": True,
            "currentPackageLockSha256": CURRENT_LOCK_SHA256,
            "historicalA78BindingClass": "HISTORICAL_STALE_LOCK_HASH_AND_DENOMINATOR",
            "historicalA78RemoteRows": 654,
            "currentRemoteRows": 661,
            "currentBaselineExactCasCoverage": "41/661",
            "exactTarballsRecoveredFromPreexistingLocalCache": 26,
            "combinedExactCasCoverage": "67/661",
            "remainingExactTarballsOrLockPaths": 594,
            "networkRequestsExecuted": 0,
            "node22FixtureFamilies": "6/6",
            "node24LineFixtureFamilies": "6/6",
            "crossRuntimeReceiptByteParity": "6/6",
            "crossRuntimeRuntimeByteParity": "6/6",
            "canonicalProtectedPathsUnchanged": "13/13",
        },
        "dependencyBoundary": {
            "currentLockRemoteRows": 661,
            "exactCoveredLockPaths": 67,
            "coveragePercent": 10.136,
            "remainingUncovered": 594,
            "allRecoveredSriVerified": True,
            "allRecoveredSha256Verified": True,
            "offlineNpmCiExecuted": False,
            "dependencyClosure": False,
        },
        "runtimeBoundary": {
            "requiredNode": "24.18.0",
            "requiredNpm": "11.16.0",
            "requiredFinalPlatformByV15": "Windows",
            "observedNode22": "22.16.0",
            "observedNode24Line": "24.11.1",
            "exactProjectNodeMatched": False,
            "exactWindowsExecuted": False,
            "fullTypecheckExecutedThisPass": False,
            "fullLintExecutedThisPass": False,
            "webpackBuildExecutedThisPass": False,
            "turbopackBuildExecutedThisPass": False,
            "browserExecutedThisPass": False,
            "pdfCorpusReplayedThisPass": False,
        },
        "coreProductClosure": {
            "scorePolicy": "V15_INTERNAL_PRODUCT_CLOSURE_0_TO_100_PER_PRODUCT_TIER",
            "rows": closure_rows,
            "scoresAwardedThisPass": 0,
            "rowDenominator": 15,
            "truthBoundary": (
                "Node-major fixture compatibility and partial exact CAS coverage are valuable internal evidence but do not "
                "satisfy any complete V15 product-tier 100-point current-receipt row."
            ),
        },
        "denominators": {
            "productTierProfilesMapped": "33/33",
            "canonicalCompleteSameInputProfiles": "0/33",
            "workingAngelRiskSameInputProfiles": "6/33",
            "workingAngelRiskValuePassedProfiles": "0/6",
            "allCurrentValuePassedProfiles": "0/33",
            "currentLockExactArtifactCoverage": "67/661",
            "dependencyClosure": "0/1",
            "node24LineFixtureFamilies": "6/6",
            "exactNode24180Windows": "0/1",
            "browserDistinctTierExecutions": "0/3",
            "browserFinalTierHoldouts": "0/3",
            "saleEligible": "0/33",
            "fullReleaseConvergence": "0/3",
            "finalAiValidation": "NOT_STARTED_BY_V15_RULE",
            "realExternalProof": "0/9",
        },
        "releaseDecision": {
            "goInternal": False,
            "controlledPilot": False,
            "goPaid": False,
            "saleEnabled": False,
            "live": False,
            "worldClassProven": False,
        },
        "openRequiredForGoInternal": [
            "REMAINING_594_CURRENT_LOCK_PATHS_AND_EXACT_OFFLINE_NPM_CI",
            "EXACT_NODE_24_18_0_NPM_11_16_0_AND_EXACT_WINDOWS_CURRENT_FINAL_BYTES",
            "CANONICAL_A85_RUNTIME_POLICY_BINDING_NOT_TEMP_WORKTREE_ONLY",
            "FULL_TYPECHECK_LINT_DUAL_BUILD_ON_P38_CURRENT_SOURCE",
            "CURRENT_BROWSER_ACCESSIBILITY_CREDENTIAL_JSON_HYGIENE_AND_PDF_INTEGRATION",
            "THREE_DISTINCT_BROWSER_BASIC_PRO_ADVANCED_EXECUTIONS",
            "FINAL_SAME_INPUT_OUTPUTS_FOR_ALL_15_CORE_PRODUCT_TIER_ROWS",
            "GROUND_TRUTH_ACCURACY_CALIBRATION_AND_NEGATIVE_CASES",
            "MATERIAL_BLIND_VALIDATED_PRO_AND_ADVANCED_TIER_DELTA",
            "FIELD_LEVEL_FREE_LEGAL_CURRENT_SOURCE_REGISTRY",
            "THREE_FULL_RELEASE_CONVERGENCE_ROUNDS",
        ],
        "externalOpenRequiredForPaid": p37.get("externalOpenRequiredForPaid", []),
        "deferredNoFeatureCredit": p37.get("deferredNoFeatureCredit", []),
        "truthBoundary": (
            "P38 corrects the stale historical A78 lock binding against current bytes, recovers 26 exact current-lock "
            "tarballs without network access, and proves six fixture harness families byte-identical across Node 22.16.0 "
            "and Node 24.11.1. Exact Node 24.18.0/Windows, complete dependencies, npm ci, typecheck, builds, Browser, "
            "customer outputs/value, legal source coverage and release convergence remain open."
        ),
    }
    write_integrity_json(STATUS, status)

    authority: dict[str, Any] = {
        "schemaVersion": "velmere.p38.current-authority.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T03:33:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "parent": {
            "root": "R44P46",
            "checkpoint": "P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING",
            "sourceAggregateSha256": P37_SOURCE_AGGREGATE,
        },
        "currentCheckpoint": REVISION,
        "authorityFiles": {
            "ownerDirectiveV15": file_binding(V15),
            "currentStateLedger": {
                "path": LEDGER.relative_to(ROOT).as_posix(),
                "sha256": "BOUND_AFTER_LEDGER_GENERATION",
            },
        },
        "currentSource": file_binding(SOURCE_IDENTITY),
        "currentStatus": file_binding(STATUS),
        "evidenceBindings": {
            "currentLockCasPolicy": file_binding(CAS_POLICY),
            "localCacheImportManifest": file_binding(CAS_MANIFEST),
            "currentLockCasRecoveryReceipt": file_binding(CAS_RECEIPT),
            "nodeMajorDifferential": file_binding(NODE_DIFFERENTIAL),
            "p37AngelRiskWorkingSameInput": file_binding(P37_ANGEL_RISK),
        },
        "authorityRule": (
            "V15 remains exact and unchanged. P38 replaces P37 as current working source authority only after this source "
            "identity and deterministic package are verified. P37 remains the last packaged parent checkpoint."
        ),
        "releaseDecision": status["releaseDecision"],
        "truthBoundary": status["truthBoundary"],
    }
    write_integrity_json(AUTHORITY, authority)

    table1_headers = [
        "Product", "Tier", "Previous %", "Current %", "Delta pp", "Exact current output",
        "Customer value today", "Missing to 100", "Hard blocker", "Evidence/receipt",
    ]
    table1_rows: list[list[str]] = []
    for product in core_products:
        for tier in tiers:
            current_output = node_family_by_product[product]
            customer_value = "Internal fixture behavior only; no final customer-value credit"
            missing = "Exact runtime/deps + legal data + same-input + accuracy/value + Browser/convergence"
            blocker = "Exact Node/Windows + 594 lock paths + final outputs"
            evidence = "P38 CAS + Node differential" if product != "Browser/PDF" else "P38 status; P37 historical Browser/PDF"
            table1_rows.append([
                product, tier, "0% V15", "0% credited", "0", current_output,
                customer_value, missing, blocker, evidence,
            ])

    targets = {
        "Audit": {
            "Basic": "Verified findings, severity, evidence, key actions",
            "Pro": "Exploitability, deeper evidence chain, priority, remediation",
            "Advanced": "Attack paths, business impact, executive+technical plan",
        },
        "Real Markets": {
            "Basic": "Current market snapshot with provenance and freshness",
            "Pro": "Multi-source context, liquidity, volatility, anomalies, risk",
            "Advanced": "Scenarios, cross-asset/regime, conflicts, playbook",
        },
        "Shield": {
            "Basic": "Honest asset/entity risk screen",
            "Pro": "Relations, exposures, deeper evidence, action priority",
            "Advanced": "Chained exposure graph and evidence adjudication",
        },
        "Shield Pro": {
            "Basic": "Working investigator terminal with useful result",
            "Pro": "Deeper query, correlation, evidence workflow, replayability",
            "Advanced": "Case workspace, audit trail, adjudication, export/handoff",
        },
        "Browser/PDF": {
            "Basic": "Readable evidence-backed report with current limitations",
            "Pro": "Deeper extraction, cross-check, provenance, new actions",
            "Advanced": "Decision dossier, traceability, conflicts, exact bytes",
        },
    }
    table2_headers = ["Product", "Tier", "CURRENT", "TARGET", "GAP", "Action completed this pass", "Next action"]
    table2_rows: list[list[str]] = []
    for product in core_products:
        for tier in tiers:
            if product == "Browser/PDF":
                current = "P37 historical route/PDF evidence; no P38 final Browser/PDF execution"
                action = "Current lock/CAS groundwork only; no Browser promotion"
                next_action = "Complete dependencies and exact build, then run three distinct Browser tiers"
            elif product == "Shield Pro":
                current = "A85 fixture runtime passes on Node 22.16 and 24.11 with temp current-source binding"
                action = "6/6 cross-runtime family parity; A85 temp binding runtime physically executed"
                next_action = "Make canonical current A85 runtime policy, then exact 24.18/Windows same-input output"
            else:
                current = f"{node_family_by_product[product]}; no exact final customer output"
                action = "Current lock rebound; +26 exact tarballs; 22/24-line deterministic parity"
                next_action = "Recover remaining dependencies, exact npm ci/build, then same-input output audit"
            gap = "Exact 24.18/Windows + complete deps + legal current data + final same-input value + convergence"
            table2_rows.append([product, tier, current, targets[product][tier], gap, action, next_action])

    table3_headers = ["Metric", "Previous", "Current", "Delta", "Remaining", "Credit class"]
    table3_rows = [
        ["Canonical owner directive bound", "1/1", "1/1", "0", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["SOURCE_ONLY source identity", "P37 6575 files", f"P38 {source['fileCount']} files", f"+{source['fileCount'] - 6575}", "0 after final ZIP", "CURRENT_SOURCE_IDENTITY"],
        ["Current package-lock hash/denominator bound", "A78 historical 654 / stale hash", "661 / current e228adec…", "+7 rows + current hash", "0 binding gap", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Exact current-lock CAS coverage", "41/661 current baseline", "67/661", "+26 paths / +3.933 pp", "594", "IMPLEMENTED_AND_TESTED_INTERNAL_PARTIAL"],
        ["Recovered exact tarballs", "0 P38", "26/26", "+26", "594 lock paths remain", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Network requests for recovery", "N/A", "0", "0", "0", "FREE_OFFLINE_RECOVERY"],
        ["Node 24-line fixture families", "0/6 current", "6/6", "+6", "exact 24.18 still open", "IMPLEMENTED_AND_TESTED_INTERNAL_NODE24_LINE"],
        ["Cross-runtime receipt/runtime byte parity", "0/6", "6/6 + 6/6", "+6 + +6", "0 for tested families", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["Exact project Node 24.18 + Windows", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Offline npm ci / dependency closure", "0/1", "0/1", "0", "594 paths + install", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Canonical complete same-input profiles", "0/33", "0/33", "0", "33", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Working Angel/Risk same-input executions", "6/33", "6/33", "0", "27 + exact runtime", "IMPLEMENTED_SOURCE_BUT_RUNTIME_MISMATCH"],
        ["Material tier-value profiles passed", "0/33", "0/33", "0", "33", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Distinct Browser tier executions", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Full release convergence rounds", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Sale-eligible profiles", "0/33", "0/33", "0", "33", "STOP_SELL"],
        ["FINAL_AI_VALIDATION", "not started", "not started", "0", "after 100% product closure", "DEFERRED_BY_V15_RULE"],
        ["REAL_EXTERNAL_PROOF", "0/9", "0/9", "0", "9", "EXTERNAL_OPEN_REQUIRED_FOR_PAID"],
    ]

    ledger_text = f"""VELMÈRE — CURRENT STATE & PASS DELTA LEDGER
REVISION: {REVISION}
DATE: 14.08.2026
STATUS: CURRENT_SOURCE_ONLY_IN_PROGRESS / NO_GO
PARENT ROOT: R44P46
CURRENT AUTHORITY: V15 exact SHA-256 {EXPECTED_V15_SHA256}
CURRENT SOURCE: {source['fileCount']} files / {source['sourceAggregateSha256']}
CURRENT PACKAGE-LOCK: 661 remote rows / SHA-256 {CURRENT_LOCK_SHA256}

IMPORTANT SCORE BOUNDARY
0% in Table 1 remains zero complete V15 CURRENT-PRODUCT-CLOSURE points. P38 produced real
internal progress in dependency evidence and Node-24-line compatibility, but those partial gates
must not be converted into final customer-output, value, legal-data, Browser, or release credit.

TABELA 1 — CORE PRODUCT PROGRESS
{table(table1_headers, table1_rows)}

TABELA 2 — CURRENT → TARGET → GAP
{table(table2_headers, table2_rows)}

TABELA 3 — GLOBAL DENOMINATORS
{table(table3_headers, table3_rows)}

CANONICAL LAST FINAL HANDOFF
P37 / V15 / source aggregate {P37_SOURCE_AGGREGATE}.

CURRENT WORKING STATE
P38 binds the current package-lock instead of reusing stale historical A78 values, recovers 26 exact
SRI-matching tarballs from a pre-existing local content cache with zero network requests, and raises
current exact CAS coverage from 41/661 to 67/661. Six deterministic fixture families pass under both
Node 22.16.0 and Node 24.11.1 with byte-identical receipt and runtime outputs. Exact Node 24.18.0,
Windows, complete dependencies, npm ci, build, Browser and final customer outputs remain open.

EXECUTED DENOMINATOR
- Current lock binding: 661/661 rows enumerated from current bytes; historical A78 654-row binding marked stale.
- Exact local CAS recovery: 26/26 imported tarballs, SRI 26/26, SHA-256 26/26, zero network requests.
- Combined exact current-lock coverage: 67/661; 594 remain.
- Node 22.16 fixture families: 6/6 PASS.
- Node 24.11 line fixture families: 6/6 PASS.
- Cross-runtime deterministic parity: receipts 6/6, runtimes 6/6.
- Canonical protected paths unchanged during isolated execution: 13/13.

VALUE-PASSED DENOMINATOR
- Angel/Risk remains 0/6 material tier value; 0% novelty and 100% duplication from P37.
- All product-tier profiles remain 0/33 current material tier-value PASS.
- Node-line fixture parity is not customer-value proof.

INTERNAL_PRODUCT_CLOSURE
0/15 core product-tier rows have a complete V15 100-point current receipt. Partial dependency and
runtime compatibility progress is shown separately and not merged into a magic readiness score.

FINAL_AI_VALIDATION
NOT_STARTED_BY_V15_RULE. Starts only after 100% product closure across all five core products.

REAL_EXTERNAL_PROOF
0/9. Real customers, independent reviewers, provider rights, legal/merchant/production proof remain zero.

RELEASE STATES
GO_INTERNAL=false | PILOT=false | GO_PAID=false | LIVE=false | WORLD_CLASS_PROVEN=false

PHYSICALLY CHANGED
1. Added a P38 current-lock policy bound to package-lock SHA-256 {CURRENT_LOCK_SHA256} and 661 rows.
2. Preserved historical A78 but classified its 654-row / old-lock binding as stale for current credit.
3. Added 26 exact content-addressed tarballs recovered from the pre-existing local npm cache, no network.
4. Added deterministic source-only CAS builder and clean-unpack verifier.
5. Added isolated Node-major differential tooling and executed A82/A84/A85/A86/A87/A88 under two Node lines.
6. A85 current input hashes were used only in isolated worktrees; historical P36 policy stayed unchanged.

TESTS RUN
- Current package-lock SHA and 661-row denominator: PASS.
- Historical A78 stale-binding detection: PASS.
- Baseline CAS remeasurement: 41/661.
- P38 exact recovery: +26 paths; combined 67/661; SRI/SHA-256/filename checks PASS.
- Source-only CAS replay verifier: PASS; 132 CAS tarballs scanned.
- Node 22.16.0: six fixture families 6/6 PASS.
- Node 24.11.1: six fixture families 6/6 PASS.
- Cross-runtime receipt bytes: 6/6 identical; runtime bytes: 6/6 identical.
- Canonical protected path immutability: 13/13 PASS.
- P38 source identity: {source['fileCount']}/{source['fileCount']} rows; aggregate {source['sourceAggregateSha256']}.

NOT PASSED / NOT EXECUTED
- Remaining 594 current-lock paths and full offline npm ci.
- Exact Node 24.18.0, npm 11.16.0 and exact Windows current final bytes.
- Canonical A85 runtime policy closure beyond isolated temporary binding.
- Full TypeScript, ESLint, Webpack, Turbopack, Browser, accessibility, hygiene and PDF replay on P38.
- Final same-input customer outputs and blind tier-value validation for five core products.
- Field-level free/legal current-source registry and three full release convergence rounds.

NEXT HIGHEST-VALUE TASK
Recover the remaining exact current-lock artifacts or execute an exact verified online-to-offline cache
fill, then run offline npm ci under Node 24.18.0/npm 11.16.0 on Windows. Only after dependency closure
run full typecheck/lint/dual builds and three distinct Browser tier executions. Do not add product features first.

HANDOFF HASH BOUNDARY
The final ZIP SHA-256 is appended only to the external handoff copy after deterministic packaging.
Embedding the archive hash inside the same archive would create circular mutation. The ZIP contains
this immutable ledger body, source identity, P38 policies/scripts, receipts, and package manifest.
"""
    LEDGER.write_text(ledger_text, encoding="utf-8")

    authority = load(AUTHORITY)
    authority["authorityFiles"]["currentStateLedger"] = file_binding(LEDGER)
    authority.pop("integritySha256", None)
    write_integrity_json(AUTHORITY, authority)

    handoff: dict[str, Any] = {
        "schemaVersion": "velmere.p38.handoff-manifest.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T03:34:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "requiredUserArtifacts": [
            file_binding(V15),
            file_binding(LEDGER),
            {
                "path": "VELMERE_R44P46_V15_P38_CURRENT_LOCKFILE_CAS_NODE24_DIFFERENTIAL_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip",
                "sha256": None,
                "status": "FINAL_HASH_RECORDED_IN_EXTERNAL_HANDOFF_LEDGER_AFTER_DETERMINISTIC_PACKAGE",
            },
        ],
        "currentAuthority": file_binding(AUTHORITY),
        "currentStatus": file_binding(STATUS),
        "rule": "Return only the unchanged V15 instruction, P38 current-state/pass-delta ledger, and newest complete P38 SOURCE_ONLY ZIP as the final link.",
        "releaseDecision": status["releaseDecision"],
        "selfHashBoundary": (
            "The archive SHA cannot be embedded in a file inside that archive without circular mutation. "
            "The external ledger copy records the final ZIP hash."
        ),
        "truthBoundary": status["truthBoundary"],
    }
    write_integrity_json(HANDOFF, handoff)

    print(json.dumps({
        "status": "PASS_P38_CURRENT_STATE_AUTHORITY_LEDGER_HANDOFF_BUILT",
        "sourceAggregateSha256": source["sourceAggregateSha256"],
        "v15Sha256": EXPECTED_V15_SHA256,
        "statusSha256": sha256_file(STATUS),
        "authoritySha256": sha256_file(AUTHORITY),
        "ledgerSha256": sha256_file(LEDGER),
        "handoffSha256": sha256_file(HANDOFF),
        "casCoverage": "67/661",
        "node24LineFamilies": "6/6",
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
