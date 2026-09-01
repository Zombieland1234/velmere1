#!/usr/bin/env python3
"""Build P37 status, current authority, compact pass ledger and handoff manifest."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p37"
V15 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
SOURCE_IDENTITY = ART / "source-identity.json"
P36_STATUS = ROOT / "artifacts/closure/p36/P36_STATUS.json"
PACKAGE_REPAIR = ART / "P37_P36_PACKAGE_COMPLETENESS_REPAIR.json"
A85_RECEIPT = ART / "P37_A85_CURRENT_SOURCE_BINDING_RECEIPT.json"
ANGEL_RISK = ART / "P37_ANGEL_RISK_SAME_INPUT_EXECUTION.json"
STATUS = ART / "P37_STATUS.json"
AUTHORITY = ART / "CURRENT_AUTHORITY_P37.json"
LEDGER = ART / "VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P37_V15_2026-08-13.txt"
HANDOFF = ART / "P37_HANDOFF_MANIFEST.json"
EXPECTED_V15_SHA256 = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
EXPECTED_PROJECT_NODE = "v24.18.0"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def canonical_json(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def write_integrity_json(path: Path, payload: dict[str, object]) -> None:
    payload["integritySha256"] = sha256_bytes(canonical_json(payload))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"object_required:{path}")
    return value


def file_binding(path: Path) -> dict[str, object]:
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "byteLength": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def table(headers: list[str], rows: list[list[str]], widths: list[int]) -> str:
    del widths  # Kept in the call signature for compatibility; values are never truncated.
    def clean(value: str) -> str:
        return value.replace("|", "\\|").replace("\n", " ")
    lines = [
        "| " + " | ".join(clean(value) for value in headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    lines.extend("| " + " | ".join(clean(value) for value in values) + " |" for values in rows)
    return "\n".join(lines)


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    if sha256_file(V15) != EXPECTED_V15_SHA256:
        raise RuntimeError("v15_changed")
    source = load(SOURCE_IDENTITY)
    p36 = load(P36_STATUS)
    repair = load(PACKAGE_REPAIR)
    a85 = load(A85_RECEIPT)
    angel_risk = load(ANGEL_RISK)

    if source.get("requiredAuthorityBinding", {}).get("sha256") != EXPECTED_V15_SHA256:
        raise RuntimeError("v15_not_bound_to_p37_source")
    if repair.get("restoration", {}).get("restoredCount") != 8:
        raise RuntimeError("package_repair_not_complete")
    if a85.get("staleBindingsRebound") != 3:
        raise RuntimeError("a85_rebind_not_complete")
    if angel_risk.get("summary", {}).get("profilesCompletedSameInput") != 6:
        raise RuntimeError("angel_risk_working_evidence_missing")

    core_products = ["Audit", "Real Markets", "Shield", "Shield Pro", "Browser/PDF"]
    tiers = ["Basic", "Pro", "Advanced"]
    closure_rows = []
    for product in core_products:
        for tier in tiers:
            closure_rows.append({
                "product": product,
                "tier": tier,
                "previousPercent": None,
                "currentPercent": 0,
                "deltaPercentagePoints": None,
                "scoreState": "V15_CURRENT_RECEIPT_BASELINE_OPEN",
                "reason": (
                    "No exact Node 24.18.0 + exact Windows + final same-input customer-output audit was executed "
                    "for this product-tier in P37. Existing P36 evidence is retained historically and not silently promoted."
                ),
            })

    status: dict[str, object] = {
        "schemaVersion": "velmere.p37.status.v1",
        "revision": "P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING",
        "generatedAt": "2026-08-13T21:33:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "parentCheckpoint": "P36_CURRENT_SOURCE_EVIDENCE_BINDING",
        "ownerDirective": file_binding(V15),
        "sourceIdentity": {
            "fileCount": source["fileCount"],
            "payloadBytes": source["payloadBytes"],
            "pathSetSha256": source["pathSetSha256"],
            "sourceAggregateSha256": source["sourceAggregateSha256"],
            "publicPems": source["publicPemPolicy"]["allowedPublicPemCount"],
        },
        "completedThisPass": {
            "v15BoundUnmodified": True,
            "p36PackagingDefectProven": True,
            "p36SourceIdentityFilesInArchive": "6560/6568",
            "publicVerificationKeysRestored": "8/8",
            "contentAwarePemPackagingImplemented": True,
            "a85StaleBindingsDetected": 3,
            "a85StaleBindingsRebound": 3,
            "a85StaticAssertions": "4/4",
        },
        "runtimeBoundary": {
            "requiredNode": EXPECTED_PROJECT_NODE,
            "observedNodeDuringA85BindingPass": "v22.16.0",
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
                "Zero here means zero V15 current-receipt score awarded in this pass, not that the historical product "
                "contains zero implementation. Product score requires the exact current output audit defined by V15."
            ),
        },
        "denominators": {
            "productTierProfilesMapped": "33/33",
            "canonicalP36CompleteSameInputProfiles": "0/33",
            "workingAngelRiskSameInputProfiles": "6/33",
            "workingAngelRiskValuePassedProfiles": "0/6",
            "allCurrentValuePassedProfiles": "0/33",
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
            "EXACT_NODE_24_18_0_AND_EXACT_WINDOWS_CURRENT_FINAL_BYTES",
            "FULL_TYPECHECK_LINT_DUAL_BUILD_ON_P37_CURRENT_SOURCE",
            "CURRENT_BROWSER_ACCESSIBILITY_CREDENTIAL_JSON_HYGIENE_AND_PDF_INTEGRATION",
            "THREE_DISTINCT_BROWSER_BASIC_PRO_ADVANCED_EXECUTIONS",
            "FINAL_SAME_INPUT_OUTPUTS_FOR_ALL_15_CORE_PRODUCT_TIER_ROWS",
            "GROUND_TRUTH_ACCURACY_CALIBRATION_AND_NEGATIVE_CASES",
            "MATERIAL_BLIND_VALIDATED_PRO_AND_ADVANCED_TIER_DELTA",
            "FIELD_LEVEL_FREE_LEGAL_CURRENT_SOURCE_REGISTRY",
            "THREE_FULL_RELEASE_CONVERGENCE_ROUNDS",
        ],
        "externalOpenRequiredForPaid": p36.get("externalOpenRequiredForPaid", []),
        "deferredNoFeatureCredit": p36.get("deferredNoFeatureCredit", []),
        "truthBoundary": (
            "P37 physically binds unmodified V15, repairs SOURCE_ONLY public-key completeness and repairs three stale A85 "
            "source bindings with 4/4 static assertions. Exact runtime/build/Browser/product-value work is not claimed. "
            "GO_INTERNAL, pilot, GO_PAID, LIVE and WORLD_CLASS_PROVEN remain false."
        ),
    }
    write_integrity_json(STATUS, status)

    authority: dict[str, object] = {
        "schemaVersion": "velmere.p37.current-authority.v1",
        "revision": status["revision"],
        "generatedAt": "2026-08-13T21:33:30.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "parent": {
            "root": "R44P46",
            "checkpoint": "P36_CURRENT_SOURCE_EVIDENCE_BINDING",
            "sourceAggregateSha256": p36["sourceIdentity"]["sourceAggregateSha256"],
        },
        "currentCheckpoint": "P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING",
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
            "packageCompletenessRepair": file_binding(PACKAGE_REPAIR),
            "a85CurrentSourceBinding": file_binding(A85_RECEIPT),
            "angelRiskWorkingSameInput": file_binding(ANGEL_RISK),
        },
        "authorityRule": (
            "V15 replaces V14 as current authority only because its exact bytes are bound by P37 source identity. "
            "V14 and R12 remain historical. Parent root remains R44P46."
        ),
        "releaseDecision": status["releaseDecision"],
        "truthBoundary": status["truthBoundary"],
    }
    write_integrity_json(AUTHORITY, authority)

    table1_headers = [
        "Product", "Tier", "Previous %", "Current %", "Delta pp", "Exact current output",
        "Customer value today", "Missing to 100", "Hard blocker", "Evidence/receipt",
    ]
    table1_widths = [12, 8, 10, 12, 8, 25, 25, 25, 24, 23]
    table1_rows: list[list[str]] = []
    for product in core_products:
        for tier in tiers:
            output_state = "Not re-executed on exact runtime"
            value_state = "Historical source/output only; no V15 value credit"
            missing = "Full 100-point V15 receipt set"
            blocker = "Exact runtime + same-input + legal/value"
            evidence = "P36 historical; P37 status"
            table1_rows.append([
                product, tier, "N/A V15", "0% credited", "N/A", output_state, value_state,
                missing, blocker, evidence,
            ])

    table2_headers = ["Product", "Tier", "CURRENT", "TARGET", "GAP", "Action completed this pass", "Next action"]
    table2_widths = [12, 8, 31, 31, 31, 31, 31]
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
    table2_rows: list[list[str]] = []
    for product in core_products:
        for tier in tiers:
            current = "Source/history exists; final exact P37 customer bytes not executed"
            gap = "Exact output + legal data + accuracy + blind material value + convergence"
            action = "V15 bound; packaging fixed" if product != "Shield Pro" else "V15 bound; packaging + 3 A85 bindings fixed"
            next_action = "Run exact runtime same-input audit" if product != "Shield Pro" else "Run exact Node A85 runtime then same-input audit"
            table2_rows.append([product, tier, current, targets[product][tier], gap, action, next_action])

    table3_headers = ["Metric", "Previous", "Current", "Delta", "Remaining", "Credit class"]
    table3_widths = [44, 18, 22, 15, 22, 35]
    table3_rows = [
        ["Canonical owner directive bound", "0/1", "1/1", "+1", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"],
        ["SOURCE_ONLY source identity reproducible after clean unpack", "6560/6568", f"pending P37 ZIP: {source['fileCount']}/{source['fileCount']}", "+8 restored; +7 new", "0 after package", "OPEN_UNTIL_FINAL_ZIP"],
        ["Public verification PEMs in SOURCE_ONLY", "0/8", "pending P37 ZIP: 8/8", "+8", "0 after package", "IMPLEMENTED; PACKAGE TEST PENDING"],
        ["A85 stale source bindings repaired", "0/3", "3/3", "+3", "0", "IMPLEMENTED_AND_TESTED_INTERNAL_STATIC"],
        ["A85 current static production assertions", "0/4 current", "4/4", "+4", "0", "IMPLEMENTED_AND_TESTED_INTERNAL_STATIC"],
        ["Canonical complete same-input profiles", "0/33", "0/33", "0", "33", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Working Angel/Risk same-input executions", "0/33 canonical", "6/33 working", "+6 working", "27 + exact runtime", "IMPLEMENTED_SOURCE_BUT_RUNTIME_MISMATCH"],
        ["Material tier-value profiles passed", "0/33", "0/33", "0", "33", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Distinct Browser tier executions", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Full release convergence rounds", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Exact project Node + Windows", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"],
        ["Sale-eligible profiles", "0/33", "0/33", "0", "33", "STOP_SELL"],
        ["FINAL_AI_VALIDATION", "not started", "not started", "0", "after 100% product closure", "DEFERRED_BY_V15_RULE"],
        ["REAL_EXTERNAL_PROOF", "0/9", "0/9", "0", "9", "EXTERNAL_OPEN_REQUIRED_FOR_PAID"],
    ]

    ledger_text = f"""VELMÈRE — CURRENT STATE & PASS DELTA LEDGER
REVISION: P37_V15_PACKAGE_REPRODUCIBILITY_AND_A85_BINDING
DATE: 13.08.2026
STATUS: CURRENT_SOURCE_ONLY_IN_PROGRESS / NO_GO
PARENT ROOT: R44P46
CURRENT AUTHORITY: V15 exact SHA-256 {EXPECTED_V15_SHA256}
CURRENT SOURCE: {source['fileCount']} files / {source['sourceAggregateSha256']}

IMPORTANT SCORE BOUNDARY
0% in Table 1 means zero V15 CURRENT-RECEIPT points awarded in this pass. It does not mean
that the historical source contains no implementation. P36 evidence remains historical until
re-executed or explicitly rebound under the V15 exact-output rules.

TABELA 1 — CORE PRODUCT PROGRESS
{table(table1_headers, table1_rows, table1_widths)}

TABELA 2 — CURRENT → TARGET → GAP
{table(table2_headers, table2_rows, table2_widths)}

TABELA 3 — GLOBAL DENOMINATORS
{table(table3_headers, table3_rows, table3_widths)}

CANONICAL LAST FINAL HANDOFF
P36 / V14 / R12 / source aggregate {p36['sourceIdentity']['sourceAggregateSha256']}.

CURRENT WORKING STATE
P37 binds unmodified V15, restores 8/8 exact public verification keys omitted by P36 packaging,
implements content-aware PEM packaging, and repairs 3/3 stale A85 source bindings with 4/4
static production assertions. Exact Node 24.18.0, exact Windows, build, Browser and product
same-input audits were not executed in this pass.

EXECUTED DENOMINATOR
- V15 exact binding: 1/1
- P36 package omission proof: 6560/6568 present, 8/8 missing public keys restored
- A85 current source bindings: 12/12 checked; 3/3 stale rebound
- A85 static assertions: 4/4
- Working Angel/Risk: 90 matched groups, 270 outputs, 6/6 profiles executed on Node 22.16.0

VALUE-PASSED DENOMINATOR
- Angel/Risk: 0/6; 0% novelty and 100% duplication
- All product-tier profiles: 0/33 current material tier-value PASS

INTERNAL_PRODUCT_CLOSURE
0/15 core product-tier rows scored under V15 in this pass. Baseline audit remains open.

FINAL_AI_VALIDATION
NOT_STARTED_BY_V15_RULE. Starts only after 100% product closure across all five core products.

REAL_EXTERNAL_PROOF
0/9. Real customers, independent reviewers, provider rights, legal/merchant/production proof remain zero.

RELEASE STATES
GO_INTERNAL=false | PILOT=false | GO_PAID=false | LIVE=false | WORLD_CLASS_PROVEN=false

PHYSICALLY CHANGED
1. Exact owner directive V15 copied byte-for-byte and bound to current source identity.
2. Eight public verification PEMs restored to the source tree with hashes matching P36 source identity.
3. P37 packager changed from suffix-only `.pem` exclusion to content-aware fail-closed classification.
4. Three stale A85 source hashes rebound without rewriting historical P36 policy.

TESTS RUN
- P36 ZIP/source-identity comparison: 6560/6568; exactly 8 public PEM omissions found.
- Restored public-key hash/type check: 8/8 PASS; private material 0.
- A85 current source binding: 12/12 PASS; stale set exactly 3/3; static assertions 4/4 PASS.
- V15 byte identity and source binding: PASS.
- P37 source identity: {source['fileCount']}/{source['fileCount']} source rows; 8 public PEMs; private/ambiguous PEMs 0.

NOT PASSED / NOT EXECUTED
- Exact Node 24.18.0 and exact Windows current final bytes.
- Full typecheck, lint, Webpack, Turbopack, Browser, accessibility, hygiene and PDF replay on P37.
- Final same-input outputs and blind tier-value validation for five core products.
- Three full release convergence rounds.

NEXT HIGHEST-VALUE TASK
Obtain exact Node 24.18.0 on the required Windows environment, run clean dependency closure plus
full typecheck/lint/dual build, then execute three distinct Browser tier runs and start the five-core
same-input customer-output campaign. Do not add features before that.

HANDOFF HASH BOUNDARY
The final ZIP SHA-256 is appended only to the external handoff copy of this ledger after packaging.
Embedding an archive's own hash inside itself would change the archive and create a circular identity.
The ZIP contains this ledger body, source identity, package manifest and all bounded P37 receipts.
"""
    LEDGER.write_text(ledger_text, encoding="utf-8")

    # Update authority with the final ledger binding after ledger bytes exist.
    authority = load(AUTHORITY)
    authority["authorityFiles"]["currentStateLedger"] = file_binding(LEDGER)
    authority.pop("integritySha256", None)
    write_integrity_json(AUTHORITY, authority)

    handoff: dict[str, object] = {
        "schemaVersion": "velmere.p37.handoff-manifest.v1",
        "revision": status["revision"],
        "generatedAt": "2026-08-13T21:34:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "requiredUserArtifacts": [
            file_binding(V15),
            file_binding(LEDGER),
            {
                "path": "VELMERE_R44P46_V15_P37_PACKAGE_REPRODUCIBILITY_A85_BINDING_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip",
                "sha256": None,
                "status": "FINAL_HASH_RECORDED_IN_EXTERNAL_HANDOFF_LEDGER_AFTER_DETERMINISTIC_PACKAGE",
            },
        ],
        "currentAuthority": file_binding(AUTHORITY),
        "currentStatus": file_binding(STATUS),
        "rule": "Return only V15 instruction, current state/pass delta ledger, and newest complete P37 SOURCE_ONLY ZIP as the final link.",
        "releaseDecision": status["releaseDecision"],
        "selfHashBoundary": (
            "The archive SHA cannot be embedded in a file inside the same archive without circular mutation. "
            "The external handoff ledger records the final ZIP hash."
        ),
        "truthBoundary": status["truthBoundary"],
    }
    write_integrity_json(HANDOFF, handoff)

    # Handoff creation changes no source identity because artifacts/ is excluded.
    print(json.dumps({
        "status": "PASS_P37_CURRENT_STATE_AUTHORITY_LEDGER_HANDOFF_BUILT",
        "sourceAggregateSha256": source["sourceAggregateSha256"],
        "v15Sha256": EXPECTED_V15_SHA256,
        "statusSha256": sha256_file(STATUS),
        "authoritySha256": sha256_file(AUTHORITY),
        "ledgerSha256": sha256_file(LEDGER),
        "handoffSha256": sha256_file(HANDOFF),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
