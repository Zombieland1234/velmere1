#!/usr/bin/env python3
"""Build P41 V16 status, authority, ledger and three-file handoff manifest."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p41"
V16 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V15 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
IDENTITY = ART / "source-identity.json"
POLICY = ROOT / "config/p41/p41-exact-windows-current-root-closure-policy.json"
BRIDGE_VERIFY = ART / "P41_CURRENT_ROOT_BRIDGE_VERIFICATION.json"
SELF_TEST = ART / "P41_BRIDGE_SELF_TEST.json"
FAILURE_TEST = ART / "P41_FAILURE_RECEIPT_SELF_TEST.json"
GITHUB_ATTEMPT = ART / "P41_GITHUB_WINDOWS_ATTEMPT_2026-08-14.json"
DEPENDENCY = ART / "P41_DEPENDENCY_GRAPH_CENSUS.json"
DIFFERENTIAL = ART / "P41_SOURCE_DIFFERENTIAL.json"
P40_BASELINE = ROOT / "artifacts/closure/p40/P40_EXACT_FIXTURE_PROFILE_AND_CANDIDATE_FIELD_BASELINE.json"
P40_REGISTRY = ROOT / "config/p40/p40-candidate-field-use-case-registry.json"
P39_TOPOLOGY = ROOT / "config/p39/p39-v16-product-topology-reconciliation.json"
STATUS = ART / "P41_STATUS.json"
AUTHORITY = ART / "CURRENT_AUTHORITY_P41.json"
LEDGER = ART / "VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P41_V16_2026-08-14.txt"
HANDOFF = ART / "P41_HANDOFF_MANIFEST.json"
REVISION = "P41_V16_EXACT_WINDOWS_PREFLIGHT_CURRENT_ROOT_BRIDGE_REPAIR"
V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
V15_SHA = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
P40_SOURCE = "81fd077bf390f2b1c6937d02703983ae9714849149a4c492f74f77b2446db9c7"
P40_ZIP = "c9d16106d849308dbd2950c7559259a15f69aee50fb3acd772d03c2b250e918d"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError(f"required_input_missing:{path}")
    return json.loads(path.read_text(encoding="utf-8"))


def canonical_integrity(value: dict[str, Any]) -> str:
    return sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    value["integritySha256"] = canonical_integrity(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def bind(path: Path) -> dict[str, Any]:
    return {"path": path.relative_to(ROOT).as_posix(), "byteLength": path.stat().st_size, "sha256": sha256_file(path)}


def ledger_text(identity: dict[str, Any], baseline: dict[str, Any], registry: dict[str, Any], topology: dict[str, Any], github_attempt: dict[str, Any], differential: dict[str, Any]) -> str:
    families = topology["productFamilies"]
    customer_rows = topology["customerFacingRows"]
    contexts = topology["internalExecutionProfiles"]
    profiles = {row["profileId"]: row for row in baseline["profileRows"]}
    candidate_by_family = registry["candidateRowsByFamily"]
    lines: list[str] = []
    add = lines.append

    add("VELMÈRE — CURRENT STATE & PASS DELTA LEDGER")
    add(f"REVISION: {REVISION}")
    add("DATE: 14.08.2026")
    add("STATUS: CURRENT_SOURCE_ONLY_IN_PROGRESS / NO_GO")
    add("PARENT ROOT: R44P46")
    add(f"CURRENT AUTHORITY: V16 SHA-256 {V16_SHA}")
    add(f"CURRENT SOURCE: {identity['fileCount']} files / {identity['sourceAggregateSha256']}")
    add("")
    add("SCORE BOUNDARY")
    add(
        "P41 gives current credit for a physically observed exact Windows Server 2025 x64 / Node 24.18.0 / npm 11.16.0 toolchain preflight, diagnosis of the stale embedded package payload, replacement of that bridge with a current-root execution contract, a platform-neutral source/bridge verifier, a portable bridge self-test and a negative failure-receipt test. It gives zero credit for a successful exact-Windows current-root npm ci, dependency CAS closure, TypeScript, ESLint, Webpack, Turbopack, Browser, PDF, current customer output, field rights, factual quality, paid value, sale eligibility, GO_INTERNAL, LIVE or WORLD_CLASS_PROVEN."
    )
    add("")

    add("TABLE 0 — PRODUCT TOPOLOGY TRUTH")
    add("| Family | Customer-facing type | SKU rows | Internal contexts | Delta required by catalog | Truth invariant | Current P41 evidence | Current discrepancy |")
    add("|---|---|---:|---:|---|---|---|---|")
    for family in families:
        fid = family["family"]
        sku_rows = sum(1 for row in customer_rows if row["family"] == fid)
        exact_profiles = sum(1 for profile in contexts if profile["family"] == fid and profiles[profile["profileId"]]["executionClass"].startswith("EXACT_NODE"))
        evidence = f"{exact_profiles}/3 inherited exact-Node fixture contexts; P41 bridge-only source diff" if exact_profiles else "0/3 physical Browser/PDF contexts"
        delta = "YES" if family["deltaRequiredByCatalog"] else "NO_CURRENT_CATALOG_CLAIM"
        discrepancy = "current customer output/rights/quality/value open" if fid not in {"pdf", "browser"} else "three physical Browser SKU runs and PDF replay open"
        add(f"| {fid} | {family['customerFacingType']} | {sku_rows} | 3 | {delta} | yes | {evidence} | {discrepancy} |")
    add("")

    add("TABLE 1 — CUSTOMER-FACING CLOSURE, 17-ROW DENOMINATOR")
    add("| Product/SKU | Previous % | Current % | Delta pp | Exact current output | Customer value today | Rights/freshness | Missing to 100 | Hard blocker | Sale eligible |")
    add("|---|---:|---:|---:|---|---|---|---|---|---|")
    for row in customer_rows:
        family = row["family"]
        count = candidate_by_family[family]
        add(f"| {row['rowId']} | 0% CURRENT_V16_OUTPUT_CREDIT | 0% CURRENT_V16_OUTPUT_CREDIT | 0 pp | NOT_CAPTURED | NOT_CURRENTLY_PROVEN | 0/{count} candidate rows passed | native Windows current-root execution + physical output + rights + quality + value + release gates | NO_CURRENT_CUSTOMER_OUTPUT | false |")
    add("")

    add("TABLE 2 — INTERNAL 33-PROFILE EXECUTION")
    add("| Family | Context | Previous execution | Current P41 execution | Exact bytes/hash | Truth consistency | Paid-delta applicability | Value result | Runtime match |")
    add("|---|---|---|---|---|---|---|---|---|")
    for profile in contexts:
        inherited = profiles[profile["profileId"]]
        if inherited["executionClass"].startswith("EXACT_NODE"):
            current = "P40_EXACT_NODE_FIXTURE_BYTES_TRANSITIVELY_UNAFFECTED"
            exact = f"{inherited['selectedOutputCount']} selected outputs; receipt {inherited['profileReceiptSha256'][:16]}…"
            runtime = "P39 exact Node 24.18.0 fixture bytes; P41 implementation diff excludes product code"
        else:
            current = "NO_CONTEXT_SPECIFIC_PHYSICAL_CURRENT_OUTPUT"
            exact = "historical A83 manifest only"
            runtime = "Browser/PDF exact current execution absent"
        applicability = "REQUIRED" if profile["deltaRequiredByCatalog"] else "N/A_NO_PAID_DELTA_CLAIM"
        value = "NOT_TESTED" if profile["deltaRequiredByCatalog"] or profile["context"] == "BASIC_CONTEXT" else "N/A_TRUTH_INVARIANCE_REQUIRED"
        add(f"| {profile['family']} | {profile['context']} | P40 baseline | {current} | {exact} | NOT_RETESTED_P41 | {applicability} | {value} | {runtime} |")
    add("")

    add("TABLE 3 — CURRENT → TARGET → GAP")
    add("| Scope | CURRENT | TARGET | GAP | Action completed P41 | Test result | Next action |")
    add("|---|---|---|---|---|---|---|")
    add("| Exact Windows toolchain | setup observed on Windows Server 2025 x64 with Node 24.18.0/npm 11.16.0 | exact current-root product execution | old runner failed before current-root dependency work | bound native runner/image/toolchain evidence | PREFLIGHT PASS / PRODUCT EXECUTION 0/1 | push the repaired current-root bridge and rerun |")
    add("| Package/lock identity | old embedded payload decoded package.json to a non-current SHA | direct current-root package/lock bytes | stale payload was a false bridge | removed embedded package transport from the new bridge | verifier PASS; 0 stale payload references | native exact-Windows rerun |")
    add("| Failure evidence | old run exited before writing any receipt and artifact upload failed | receipt and logs survive every failure | diagnostic evidence could disappear | checkpointed receipt + if: always() upload | portable simulated failure detected and receipt preserved | verify same behavior in native run |")
    add("| Dependency closure | 67/661 inherited parent cache paths; npm ci 0/1 | 661 lock paths / 618 unique SRI tarballs + online/offline npm ci | native run not executed | denominator frozen and current-root runner implemented | 661/618 static census PASS; closure 0/1 | run exact Windows job |")
    add("| TypeScript/lint/dual build | 0/4 current | 4/4 exact current source | blocked behind native install | commands bound to current package scripts | source contract PASS / execution NOT RUN | after dependency closure execute all four |")
    add("| Browser/PDF | Browser 0/3; PDF 0/1 | three Browser SKUs + independent PDF replay | exact build and lawful font missing | no false feature work | NOT_EXECUTED | after build closure; lawful font acquisition only |")
    add("")

    add("TABLE 4 — DATA / RIGHTS / FRESHNESS")
    add("| Product | Candidate rows | Rights passed | Freshness passed | Current health | Reverify-by | Blocker |")
    add("|---|---:|---:|---:|---|---|---|")
    for family in families:
        fid = family["family"]
        count = candidate_by_family[fid]
        add(f"| {fid} | {count} | 0/{count} | 0/{count} | FIXTURE_INTERNAL_ONLY_NOT_CURRENT_SOURCE_OBSERVATION | IMMEDIATE_BEFORE_CUSTOMER_OUTPUT_CREDIT | actual customer output and current field-level terms evidence |")
    add("")

    add("TABLE 5 — GLOBAL DENOMINATORS")
    add("| Metric | Previous | Current | Delta | Remaining | Credit class |")
    add("|---|---|---|---|---|---|")
    metrics = [
        ("Canonical authority binding", "1/1", "1/1", "0", "0", "CURRENT_BOUND_AUTHORITY"),
        ("P40→P41 exact source differential", "0/1", "1/1", "+1", "0", "BRIDGE_ONLY_SOURCE_CHANGE"),
        ("Observed exact Windows toolchain preflight", "0/1", "1/1", "+1", "0", "REMOTE_NATIVE_PREFLIGHT"),
        ("Stale embedded payload failure diagnosed", "0/1", "1/1", "+1", "0", "CURRENT_EVIDENCE"),
        ("Current-root bridge source contract", "0/1", "1/1", "+1", "0", "IMPLEMENTED_AND_PORTABLY_TESTED"),
        ("Portable source/bridge verifier", "0/1", "1/1", "+1", "0", "PORTABLE_INTERNAL"),
        ("Failure receipt preservation self-test", "0/1", "1/1", "+1", "0", "PORTABLE_NEGATIVE_CONTROL"),
        ("Exact Windows current-root execution", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Dependency graph denominator", "661 lock paths / 618 unique", "661 / 618", "frozen", "0 definition", "STATIC_CURRENT_LOCK"),
        ("SRI CAS coverage", "67/661 inherited paths", "67/661 inherited paths", "0", "594 lock paths", "PARENT_EVIDENCE_NOT_RERUN"),
        ("Dependency closure / npm ci", "0/1", "0/1", "0", "1 native online+offline", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("TypeScript / ESLint / Webpack / Turbopack", "0/4", "0/4", "0", "4", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Internal fixture profiles", "27/33", "27/33", "0", "6 Browser/PDF", "TRANSITIVE_INTERNAL_FIXTURE_ONLY"),
        ("Distinct Browser SKU executions", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("PDF independent replay", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Physical customer outputs", "0/17", "0/17", "0", "17", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Candidate field rights", "0/176", "0/176", "0", "176", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Required material deltas passed", "0/6", "0/6", "0", "6", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Sale-eligible customer rows", "0/17", "0/17", "0", "17", "STOP_SELL"),
        ("Release convergence", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("FINAL_AI_VALIDATION", "not started", "not started", "0", "after internal closure", "DEFERRED_BY_V16"),
        ("REAL_EXTERNAL_PROOF", "0", "0", "0", "after AI closure", "DEFERRED_BY_V16"),
    ]
    for metric in metrics:
        add("| " + " | ".join(metric) + " |")
    add("")

    add("CANONICAL LAST FINAL HANDOFF")
    add(f"P40 / V16 / source aggregate {P40_SOURCE} / ZIP SHA-256 {P40_ZIP}.")
    add("")
    add("CURRENT WORKING STATE")
    add(f"P41 / V16 / source aggregate {identity['sourceAggregateSha256']}. The exact hosted Windows toolchain preflight is proven, the old payload mismatch is classified, and the new current-root bridge is source-bound and portably tested. Native current-root dependency and build execution remains 0/1.")
    add("")
    add("EXECUTION COVERAGE")
    add("- Authority/topology: V16 1/1; 11/11 families; 17/17 customer rows; 33/33 contexts defined.")
    add("- Exact Windows Server 2025 x64 / Node 24.18.0 / npm 11.16.0 environment setup: observed PASS.")
    add("- Current-root bridge verifier: PASS; portable self-test: PASS; simulated failure receipt: PASS.")
    add(f"- Source differential: {len(differential['added'])} added bridge/closure source files; 0 modified product files; 0 removed files.")
    add("- Exact Windows current-root npm ci/build: 0/1; Browser 0/3; PDF 0/1; customer outputs 0/17; sale 0/17.")
    add("")
    add("QUALITY RESULTS")
    add("No new customer factual-accuracy, precision/recall, calibration, comprehension or material-value metric was executed. P41 improves release-bridge truth and failure observability only.")
    add("")
    add("RELEASE STATES")
    add("GO_INTERNAL=false | FINAL_AI_VALIDATION_READY=false | PILOT_READY=false | GO_PAID=false | LIVE=false | WORLD_CLASS_PROVEN=false")
    add("")
    add("PHYSICALLY CHANGED")
    add("1. Added a new exact-Windows workflow that checks out the current root directly with read-only permissions and no persisted credentials.")
    add("2. Removed the stale embedded package payload from the new closure path; package.json and package-lock.json are verified directly against the P40 current hashes.")
    add("3. Added exact 661-lock-path / 618-unique-tarball denominator checks, online/offline npm ci stages, SRI CAS, npm ls, TypeScript, ESLint and dual-build stages.")
    add("4. Added checkpointed receipts after every stage and an always-upload evidence path, including failure cases.")
    add("5. Added a portable current-root verifier and executed a positive self-test plus a negative simulated-failure test.")
    add("6. Bound the observed failed GitHub run as exact toolchain preflight evidence without granting dependency or build credit.")
    add("")
    add("NOT PASSED / NOT EXECUTED")
    add("- Repaired P41 workflow has not yet been pushed and executed on native Windows current source.")
    add("- Successful exact-Windows online/offline npm ci and 618/618 SRI CAS remain open.")
    add("- Current TypeScript, ESLint, Webpack and Turbopack remain 0/4.")
    add("- Browser/PDF, customer outputs, current external data, rights, holdouts, security/accessibility and convergence remain open.")
    add("")
    add("NEXT HIGHEST-VALUE TASK")
    add("Execute the repaired current-root workflow on Windows Server 2025 x64 with Node 24.18.0/npm 11.16.0. Require successful online and offline npm ci, 618/618 SRI-verified tarballs, npm ls, semantic TypeScript, ESLint, Webpack and Turbopack, with raw evidence uploaded even on failure. Then ingest the native receipt before starting Browser SKU execution. Do not add customer-facing features.")
    add("")
    add("GITHUB ATTEMPT BOUNDARY")
    add(f"Run {github_attempt['workflowRunId']} / job {github_attempt['jobId']} / head {github_attempt['headSha']} proves setup only. Its package mismatch prevented current-root dependency execution, and no artifact evidence was uploaded.")
    add("")
    add("HANDOFF HASH BOUNDARY")
    add("The final ZIP SHA-256 is appended only to the external ledger after deterministic packaging. The internal ledger remains non-circular.")
    return "\n".join(lines) + "\n"


def main() -> int:
    if sha256_file(V16) != V16_SHA or sha256_file(V15) != V15_SHA:
        raise RuntimeError("authority_bytes_drift")
    identity = load(IDENTITY)
    policy = load(POLICY)
    bridge_verify = load(BRIDGE_VERIFY)
    self_test = load(SELF_TEST)
    failure_test = load(FAILURE_TEST)
    github_attempt = load(GITHUB_ATTEMPT)
    dependency = load(DEPENDENCY)
    differential = load(DIFFERENTIAL)
    baseline = load(P40_BASELINE)
    registry = load(P40_REGISTRY)
    topology = load(P39_TOPOLOGY)

    if identity["parentSourceAggregateSha256"] != P40_SOURCE:
        raise RuntimeError("parent_source_aggregate_mismatch")
    if bridge_verify["status"] != "PASS" or self_test["status"] != "PASS":
        raise RuntimeError("bridge_positive_verification_missing")
    if failure_test["expectedNonZeroExitObserved"] is not True or failure_test["receiptStatus"] != "FAIL":
        raise RuntimeError("failure_receipt_negative_control_missing")
    if github_attempt["classification"] != "EXACT_WINDOWS_TOOLCHAIN_PREFLIGHT_PASS_PAYLOAD_IDENTITY_FAIL":
        raise RuntimeError("github_attempt_classification_drift")
    if dependency["lockPathsWithResolvedIntegrity"] != 661 or dependency["uniqueResolvedIntegrityTarballs"] != 618:
        raise RuntimeError("dependency_denominator_drift")
    if differential["modified"] or differential["removed"]:
        raise RuntimeError("p41_product_source_mutation_detected")
    if baseline["denominators"]["exactNodeBoundInternalFixtureProfiles"] != "27/33":
        raise RuntimeError("p40_fixture_baseline_drift")
    if registry["candidateRows"] != 176 or registry["rightsPassed"] != 0:
        raise RuntimeError("p40_registry_baseline_drift")

    decision = {"goInternal": False, "finalAiValidationReady": False, "pilotReady": False, "goPaid": False, "live": False, "worldClassProven": False}
    status = {
        "schemaVersion": "velmere.p41.status.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T09:35:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "authority": bind(V16),
        "sourceIdentity": bind(IDENTITY),
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
        "positiveCurrentCredit": {
            "exactWindowsToolchainPreflightObserved": True,
            "stalePayloadIdentityFailureDiagnosed": True,
            "currentRootBridgeImplemented": True,
            "portableBridgeVerifierPassed": True,
            "portableBridgeSelfTestPassed": True,
            "failureReceiptNegativeControlPassed": True,
            "dependencyDenominator": "661 lock paths / 618 unique tarballs",
        },
        "zeroCredit": {
            "exactWindowsCurrentRootExecution": True,
            "dependencyClosure": True,
            "typecheckLintDualBuild": "0/4",
            "browserDistinctSkuExecutions": "0/3",
            "pdfIndependentReplay": "0/1",
            "customerOutputs": "0/17",
            "fieldRights": "0/176",
            "materialDeltas": "0/6",
            "saleEligibleRows": "0/17",
            "convergence": "0/3",
        },
        "releaseDecision": decision,
        "truthBoundary": "P41 repairs and tests the exact-Windows current-root closure bridge and records native toolchain preflight evidence. It remains NO_GO and grants no successful native dependency/build, Browser/PDF, customer-output, rights, paid-value or sale credit.",
    }
    write_json(STATUS, status)

    authority = {
        "schemaVersion": "velmere.p41.current-authority.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T09:36:00.000Z",
        "parentRoot": "R44P46",
        "currentOwnerDirective": bind(V16),
        "previousAuthorityHistorical": bind(V15),
        "currentSourceIdentity": bind(IDENTITY),
        "currentSourceAggregateSha256": identity["sourceAggregateSha256"],
        "releaseDecision": decision,
        "authorityState": "V16_CURRENT_BOUND_AUTHORITY_P41_NO_GO",
        "truthBoundary": "V16 remains unchanged and current. P41 is a closure checkpoint under R44P46, not a new root or release approval.",
    }
    write_json(AUTHORITY, authority)

    LEDGER.write_text(ledger_text(identity, baseline, registry, topology, github_attempt, differential), encoding="utf-8")

    handoff = {
        "schemaVersion": "velmere.p41.handoff-manifest.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T09:37:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "requiredUserArtifacts": [
            {"order": 1, "kind": "OWNER_DIRECTIVE", "filename": V16.name, "sha256": V16_SHA, "status": "CURRENT_BOUND_AUTHORITY_UNCHANGED"},
            {"order": 2, "kind": "CURRENT_STATE_LEDGER", "filename": "VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P41_V16_2026-08-14.txt", "sha256InsideSource": sha256_file(LEDGER), "status": "CURRENT_P41_NO_GO"},
            {"order": 3, "kind": "SOURCE_ONLY_ZIP", "filename": "VELMERE_R44P46_V16_P41_EXACT_WINDOWS_PREFLIGHT_CURRENT_ROOT_BRIDGE_REPAIR_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip", "sha256": "APPEND_EXTERNALLY_AFTER_PACKAGING", "status": "CURRENT_SOURCE_ONLY_IN_PROGRESS"},
        ],
        "supportingReceiptsInsideSourceOnly": [bind(path) for path in (STATUS, AUTHORITY, POLICY, BRIDGE_VERIFY, SELF_TEST, FAILURE_TEST, GITHUB_ATTEMPT, DEPENDENCY, DIFFERENTIAL)],
        "releaseDecision": decision,
        "truthBoundary": "Exactly three main user artifacts are returned. Detailed receipts remain inside SOURCE_ONLY.",
    }
    write_json(HANDOFF, handoff)
    print(json.dumps({
        "status": "PASS_P41_CURRENT_STATE_BUILT",
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
        "exactWindowsToolchainPreflight": "1/1",
        "exactWindowsCurrentRootExecution": "0/1",
        "dependencyClosure": "0/1",
        "semanticDualBuild": "0/4",
        "customerOutputs": "0/17",
        "saleEligible": "0/17",
        "ledgerSha256": sha256_file(LEDGER),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
