#!/usr/bin/env python3
"""Build P40 V16 status, authority, internal ledger and handoff manifest."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "artifacts/closure/p40"
V16 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V16_FULL_TOPOLOGY_FREE_LEGAL_CURRENT_WORLD_CLASS_2026-08-14.txt"
V15 = ROOT / "docs/authority/VELMERE_CANONICAL_OWNER_DIRECTIVE_V15_FREE_LEGAL_TOP_WORLD_2026-08-13.txt"
IDENTITY = ART / "source-identity.json"
REPLAY = ART / "P40_A85_CANONICAL_REPLAY_AND_A83_FAIL_CLOSED_ATTEMPT.json"
BASELINE = ART / "P40_EXACT_FIXTURE_PROFILE_AND_CANDIDATE_FIELD_BASELINE.json"
DIFFERENTIAL = ART / "P40_SOURCE_DIFFERENTIAL.json"
REGISTRY = ROOT / "config/p40/p40-candidate-field-use-case-registry.json"
PROFILE_POLICY = ROOT / "config/p40/p40-fixture-profile-binding-policy.json"
P39_DEPENDENCY = ROOT / "artifacts/closure/p39/P39_EXACT_TOOLCHAIN_AND_DEPENDENCY_BASELINE.json"
P39_TOPOLOGY = ROOT / "config/p39/p39-v16-product-topology-reconciliation.json"
STATUS = ART / "P40_STATUS.json"
AUTHORITY = ART / "CURRENT_AUTHORITY_P40.json"
LEDGER = ART / "VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P40_V16_2026-08-14.txt"
HANDOFF = ART / "P40_HANDOFF_MANIFEST.json"
REVISION = "P40_V16_A85_CANONICAL_REPLAY_SOURCE_DIFFERENTIAL_FIXTURE_PROFILE_BASELINE"
V16_SHA = "67816a5a9238668c8080a3a8cc623f078d268c1b78fddf534cb4893bb45490e9"
V15_SHA = "5cfbbfcbcef7242e30466f18bab3ad29cad859e485a909a4ee8658fb65e2f2c0"
P39_SOURCE_AGG = "f8caeb6d43dcc509d234d58c5e98780babe476755046fc6a92e13e2b44a79968"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError(f"required_input_missing:{path}")
    return json.loads(path.read_text(encoding="utf-8"))


def stable_integrity(value: dict[str, Any]) -> str:
    return sha256_bytes(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))


def write_json(path: Path, value: dict[str, Any]) -> None:
    value["integritySha256"] = stable_integrity(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def bind(path: Path) -> dict[str, Any]:
    return {"path": path.relative_to(ROOT).as_posix(), "byteLength": path.stat().st_size, "sha256": sha256_file(path)}


def ledger_text(identity: dict[str, Any], replay: dict[str, Any], baseline: dict[str, Any], differential: dict[str, Any], registry: dict[str, Any], topology: dict[str, Any]) -> str:
    profiles = {row["profileId"]: row for row in baseline["profileRows"]}
    candidate_by_family = registry["candidateRowsByFamily"]
    family_rows = topology["productFamilies"]
    customer_rows = topology["customerFacingRows"]
    contexts = topology["internalExecutionProfiles"]
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
    add("P40 gives current credit for the canonical A85 binding repair, a physical isolated A85 replay with exact-byte parity to the P39 Node 24.18.0 campaign, a physical A83 fail-closed replay attempt, an exact P39→P40 source differential, 27/33 context-level internal fixture bindings and a frozen 176-row candidate field/use-case denominator. It gives zero customer-output, current-data, field-rights, factual-quality, paid-value, Browser/PDF, Windows/dependency/build, GO_INTERNAL, sale or world-class credit.")
    add("")
    add("TABLE 0 — PRODUCT TOPOLOGY TRUTH")
    add("| Family | Customer-facing type | SKU rows | Internal contexts | Delta required | Current P40 fixture binding | Candidate fields | Current discrepancy |")
    add("|---|---|---:|---:|---|---|---:|---|")
    for family in family_rows:
        fid = family["family"]
        row_count = sum(1 for row in customer_rows if row["family"] == fid)
        exact_count = sum(1 for row in contexts if row["family"] == fid and profiles[row["profileId"]]["executionClass"] == "EXACT_NODE_24_18_0_BOUND_INTERNAL_FIXTURE_PROFILE")
        binding = f"{exact_count}/3 exact-Node-bound internal fixture" if exact_count else "0/3; historical A83 manifest only"
        discrepancy = "customer output/rights/value still open" if fid not in {"pdf", "browser"} else "physical replay/Browser execution blocked; customer output open"
        add(f"| {fid} | {family['customerFacingType']} | {row_count} | 3 | {'YES' if family['deltaRequiredByCatalog'] else 'NO_CURRENT_CATALOG_CLAIM'} | {binding} | {candidate_by_family[fid]} | {discrepancy} |")
    add("")
    add("TABLE 1 — CUSTOMER-FACING CLOSURE, 17 ROWS")
    add("| Product/SKU | Previous % | Current % | Delta pp | Exact current customer output | Internal fixture evidence | Rights/freshness | Missing to 100 | Sale eligible |")
    add("|---|---:|---:|---:|---|---|---|---|---|")
    for row in customer_rows:
        family = row["family"]
        fixture = "27/33 program includes this family" if family not in {"pdf", "browser"} else "A83 manifest diagnostic; physical replay absent"
        blocker = "Windows/deps/build + physical output + rights + quality + value + release gates"
        add(f"| {row['rowId']} | 0% CURRENT_V16_OUTPUT_CREDIT | 0% CURRENT_V16_OUTPUT_CREDIT | 0 pp | NOT_CAPTURED | {fixture} | 0/{candidate_by_family[family]} candidate rows passed | {blocker} | false |")
    add("")
    add("TABLE 2 — INTERNAL 33-PROFILE EXECUTION")
    add("| Family | Context | Previous execution | Current execution | Exact artifact binding | Value result | Runtime boundary | Sale credit |")
    add("|---|---|---|---|---|---|---|---|")
    for profile in contexts:
        row = profiles[profile["profileId"]]
        if row["executionClass"] == "EXACT_NODE_24_18_0_BOUND_INTERNAL_FIXTURE_PROFILE":
            current = "EXACT_NODE_24_18_0_BOUND_INTERNAL_FIXTURE_PROFILE"
            binding = f"{row['selectedOutputCount']} selected outputs; profile receipt {row['profileReceiptSha256'][:16]}…"
            runtime = "P39 exact Node 24.18.0 runtime bytes; P40 source differential bound"
        else:
            current = "NO_CONTEXT_SPECIFIC_PHYSICAL_FIXTURE_OUTPUT"
            binding = "A83 historical manifest subset only"
            runtime = "A83 P40 attempt failed closed: external font required; Browser 0"
        value = "NOT_TESTED" if profile["context"] == "BASIC_CONTEXT" or profile["deltaRequiredByCatalog"] else "N/A_NO_PAID_DELTA_CLAIM"
        add(f"| {profile['family']} | {profile['context']} | P39 family-level fixture campaign / no context receipt | {current} | {binding} | {value} | {runtime} | none |")
    add("")
    add("TABLE 3 — CURRENT → TARGET → GAP")
    add("| Scope | CURRENT | TARGET | GAP | Action completed P40 | Test result | Next action |")
    add("|---|---|---|---|---|---|---|")
    add("| A85 Shield Pro/Map | canonical policy had 3 stale source hashes | current source-bound policy and reproducible fixture runtime | exact Windows/customer-output/data rights remain | repaired 3 bindings; restored runtime; isolated replay | PASS; receipt/runtime match P39 exact Node bytes | retain repair and rerun later in exact Windows release suite |")
    add("| A83 Browser/PDF | historical synthetic manifest; physical corpus excluded | independent exact PDF replay and 3 Browser SKU runs | external font and dependencies/runtime | physical replay attempt under current bytes | FAIL-CLOSED as designed: lens_pdf_external_font_path_required | obtain legally redistributable font or deterministic licensed acquisition, then replay |")
    add("| 33 contexts | P39 six family campaigns not mapped per context | exact context receipts | Browser/PDF 6 profiles open; customer outputs not represented | generated 33 receipts; 27 exact-node fixture bindings | PASS bounded internal execution mapping | run physical customer-facing outputs after build closure |")
    add("| Data/rights | denominator undefined | field-level current legal registry | actual promised fields and current terms | froze 176 fixture-schema candidate rows | PASS denominator only; 0/176 rights | adjudicate against physical customer outputs and current source terms |")
    add("| Engineering | P39 exact Linux bounded + dependency 67/661 | exact Windows, clean npm ci, typecheck/lint/dual build | 594 lock paths + Windows execution | exact source differential and lock continuity verified | PASS differential; zero build credit | recover SRI-verified cache and execute exact Windows suite |")
    add("")
    add("TABLE 4 — DATA / RIGHTS / FRESHNESS")
    add("| Product | Candidate rows | Rights passed | Freshness passed | Current health | Status | Blocker |")
    add("|---|---:|---:|---:|---|---|---|")
    for family in family_rows:
        fid = family["family"]
        count = candidate_by_family[fid]
        add(f"| {fid} | {count} | 0/{count} | 0/{count} | FIXTURE_INTERNAL_ONLY_NOT_CURRENT_SOURCE_OBSERVATION | EXPIRED_REVERIFY_REQUIRED / UNKNOWN_BLOCKED | promised-field adjudication + current terms evidence |")
    add("")
    add("TABLE 5 — GLOBAL DENOMINATORS")
    add("| Metric | Previous | Current | Delta | Remaining | Credit class |")
    add("|---|---|---|---|---|---|")
    metrics = [
        ("V16 exact authority", "1/1", "1/1", "0", "0", "CURRENT_BOUND_AUTHORITY"),
        ("P39→P40 exact source differential", "0/1", "1/1", "+1", "0", "IMPLEMENTED_AND_TESTED_INTERNAL"),
        ("A85 canonical stale binding", "0/1 canonical; temporary P39 rebind", "1/1 canonical", "+1", "0", "IMPLEMENTED_AND_TESTED_INTERNAL_FIXTURE_ONLY"),
        ("A85 isolated replay", "temporary exact-Node campaign", "current canonical policy replay + exact-byte parity", "+1 current replay", "exact Windows product run", "TRANSITIVE_EXACT_NODE_BYTE_BINDING"),
        ("A83 current replay attempts", "0", "1 fail-closed attempt", "+1 diagnostic", "successful replay", "CURRENT_DIAGNOSTIC_ZERO_PDF_CREDIT"),
        ("Internal context fixture bindings", "0/33 explicit context receipts", "27/33", "+27", "6 Browser/PDF", "EXACT_NODE_BOUND_INTERNAL_FIXTURE_ONLY"),
        ("Candidate field/use-case denominator", "undefined", "176 frozen", "+176 candidate rows", "customer-output adjudication", "DENOMINATOR_ONLY"),
        ("Candidate field rights passed", "0/undefined", "0/176", "denominator frozen", "176", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Candidate field freshness passed", "0/undefined", "0/176", "denominator frozen", "176", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Current lock exact CAS", "67/661", "67/661", "0", "594", "P39_PARENT_EVIDENCE_NOT_RERUN"),
        ("Exact Windows execution", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Dependency closure / npm ci", "0/1", "0/1", "0", "594 paths + Windows npm ci", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("TypeScript / ESLint / Webpack / Turbopack current P40", "0/4", "0/4", "0", "4", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Distinct Browser SKU executions", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("PDF independent replay", "0/1", "0/1", "0", "1", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Physical current customer outputs", "0/17", "0/17", "0", "17", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Required material deltas passed", "0/6", "0/6", "0", "6", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("Sale-eligible customer rows", "0/17", "0/17", "0", "17", "STOP_SELL"),
        ("Release convergence", "0/3", "0/3", "0", "3", "OPEN_REQUIRED_FOR_GO_INTERNAL"),
        ("FINAL_AI_VALIDATION", "not started", "not started", "0", "after internal closure", "DEFERRED_BY_V16"),
        ("REAL_EXTERNAL_PROOF", "0", "0", "0", "after AI closure", "DEFERRED_BY_V16"),
    ]
    for row in metrics:
        add("| " + " | ".join(row) + " |")
    add("")
    add("CANONICAL LAST FINAL HANDOFF")
    add(f"P39 / V16 / source aggregate {P39_SOURCE_AGG}.")
    add("")
    add("CURRENT WORKING STATE")
    add(f"P40 / V16 / source aggregate {identity['sourceAggregateSha256']}. A85 canonical binding is repaired and physically replayed with exact-byte parity to P39 Node 24.18.0 evidence. 27/33 internal contexts now have explicit exact-node-bound fixture receipts. A83 remains fail-closed. The 176-row registry is a candidate denominator only.")
    add("")
    add("EXECUTION COVERAGE")
    add("- Authority and topology: 1/1 V16, 11/11 families, 17/17 customer rows, 33/33 contexts defined.")
    add("- Context-level exact-Node-bound internal fixture receipts: 27/33.")
    add("- A85 canonical replay: PASS; receipt and runtime byte parity to exact Node 24.18.0 campaign.")
    add("- A83 physical attempt: EXECUTED / FAIL-CLOSED on missing external font; PDF 0/1, Browser 0/3.")
    add("- Candidate field rows: 176 frozen; rights 0/176; freshness 0/176.")
    add("- Customer-facing exact outputs: 0/17; sale eligible: 0/17.")
    add("")
    add("QUALITY RESULTS")
    add("No new customer factual-accuracy, precision/recall, calibration, comprehension or material-value metric was executed. Fixture execution completeness is not product quality.")
    add("")
    add("RELEASE STATES")
    add("GO_INTERNAL=false | FINAL_AI_VALIDATION_READY=false | PILOT_READY=false | GO_PAID=false | LIVE=false | WORLD_CLASS_PROVEN=false")
    add("")
    add("PHYSICALLY CHANGED")
    add("1. Repaired three stale A85 source hashes in the canonical policy without changing Shield Pro/Map implementation bytes.")
    add("2. Restored the deterministic A85 runtime artifact and replayed the canonical policy in an isolated worktree.")
    add("3. Executed an A83 replay attempt; it failed closed because the external Manrope PDF font is unavailable.")
    add("4. Added exact P39→P40 and informative P36→P40 source differential receipts.")
    add("5. Added 33 context receipts: 27 exact-Node-bound internal fixture profiles and six Browser/PDF open profiles.")
    add("6. Froze 176 candidate field/use-case rows with zero rights/freshness/sale credit.")
    add("")
    add("NOT PASSED / NOT EXECUTED")
    add("- Exact Windows Node 24.18.0/npm 11.16.0 product execution.")
    add("- Remaining 594 lock paths and successful clean npm ci.")
    add("- Current semantic TypeScript, ESLint, Webpack and Turbopack.")
    add("- Three physical Browser Basic/Pro/Advanced executions.")
    add("- PDF independent replay and exact preview/download/account delivery.")
    add("- Physical current customer outputs, current external data and promised-field adjudication.")
    add("- Current terms/rights evidence, ground truth, unseen holdouts and six paid deltas.")
    add("- Security/privacy/accessibility/i18n/supply-chain/operations closure and 3 convergence rounds.")
    add("")
    add("NEXT HIGHEST-VALUE TASK")
    add("Recover the remaining 594 package-lock tarballs into an SRI-verified local cache and execute exact Windows Node 24.18.0/npm 11.16.0 npm ci, semantic TypeScript, ESLint, Webpack and Turbopack. Then run the three physical Browser SKUs and solve A83 font acquisition only on a documented lawful redistribution/acquisition basis. Do not add customer-facing features.")
    add("")
    add("HANDOFF HASH BOUNDARY")
    add("The final ZIP SHA-256 is appended only to the external ledger copy after deterministic packaging. The internal ledger remains non-circular.")
    return "\n".join(lines) + "\n"


def main() -> int:
    if sha256_file(V16) != V16_SHA or sha256_file(V15) != V15_SHA:
        raise RuntimeError("authority_bytes_drift")
    identity, replay, baseline, differential, registry, topology, dependency = map(load, (
        IDENTITY, REPLAY, BASELINE, DIFFERENTIAL, REGISTRY, P39_TOPOLOGY, P39_DEPENDENCY,
    ))
    if identity["parentSourceAggregateSha256"] != P39_SOURCE_AGG:
        raise RuntimeError("parent_source_aggregate_mismatch")
    if baseline["denominators"]["exactNodeBoundInternalFixtureProfiles"] != "27/33":
        raise RuntimeError("profile_baseline_invalid")
    if registry["candidateRows"] != 176 or registry["rightsPassed"] != 0:
        raise RuntimeError("registry_baseline_invalid")

    decision = {
        "goInternal": False,
        "finalAiValidationReady": False,
        "pilotReady": False,
        "goPaid": False,
        "live": False,
        "worldClassProven": False,
    }
    status: dict[str, Any] = {
        "schemaVersion": "velmere.p40.status.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T06:40:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "authority": bind(V16),
        "sourceIdentity": bind(IDENTITY),
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
        "positiveCurrentCredit": {
            "a85CanonicalBindingRepaired": True,
            "a85CanonicalReplayExactByteParity": True,
            "a83FailClosedAttemptExecuted": True,
            "sourceDifferential": True,
            "exactNodeBoundInternalFixtureProfiles": "27/33",
            "candidateFieldRowsFrozen": 176,
        },
        "zeroCredit": {
            "exactWindows": True,
            "dependencyClosure": True,
            "typecheckLintDualBuild": True,
            "browserDistinctSkuExecutions": "0/3",
            "pdfIndependentReplay": "0/1",
            "customerOutputs": "0/17",
            "fieldRights": "0/176",
            "materialDeltas": "0/6",
            "saleEligibleRows": "0/17",
            "convergence": "0/3",
        },
        "releaseDecision": decision,
        "truthBoundary": "P40 closes the canonical A85 fixture-policy binding and adds bounded execution/differential/denominator evidence. It remains NO_GO and grants no customer-output, current-data, rights, value, Browser/PDF, Windows/build or sale credit.",
    }
    write_json(STATUS, status)

    authority: dict[str, Any] = {
        "schemaVersion": "velmere.p40.current-authority.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T06:41:00.000Z",
        "parentRoot": "R44P46",
        "currentOwnerDirective": bind(V16),
        "previousAuthorityHistorical": bind(V15),
        "currentSourceIdentity": bind(IDENTITY),
        "currentSourceAggregateSha256": identity["sourceAggregateSha256"],
        "releaseDecision": decision,
        "authorityState": "V16_CURRENT_BOUND_AUTHORITY_P40_NO_GO",
        "truthBoundary": "V16 remains unchanged and current. P40 is a closure checkpoint under R44P46, not a new root and not a release approval.",
    }
    write_json(AUTHORITY, authority)

    LEDGER.write_text(ledger_text(identity, replay, baseline, differential, registry, topology), encoding="utf-8")

    handoff: dict[str, Any] = {
        "schemaVersion": "velmere.p40.handoff-manifest.v1",
        "revision": REVISION,
        "generatedAt": "2026-08-14T06:42:00.000Z",
        "state": "CURRENT_SOURCE_ONLY_IN_PROGRESS",
        "releaseState": "NO_GO",
        "parentRoot": "R44P46",
        "requiredUserArtifacts": [
            {"order": 1, "kind": "OWNER_DIRECTIVE", "filename": V16.name, "sha256": V16_SHA, "status": "CURRENT_BOUND_AUTHORITY_UNCHANGED"},
            {"order": 2, "kind": "CURRENT_STATE_LEDGER", "filename": "VELMERE_CURRENT_STATE_AND_PASS_DELTA_LEDGER_P40_V16_2026-08-14.txt", "sha256InsideSource": sha256_file(LEDGER), "status": "CURRENT_P40_NO_GO"},
            {"order": 3, "kind": "SOURCE_ONLY_ZIP", "filename": "VELMERE_R44P46_V16_P40_A85_CANONICAL_REPLAY_SOURCE_DIFFERENTIAL_FIXTURE_PROFILE_BASELINE_CURRENT_SOURCE_ONLY_IN_PROGRESS.zip", "sha256": "APPEND_EXTERNALLY_AFTER_PACKAGING", "status": "CURRENT_SOURCE_ONLY_IN_PROGRESS"},
        ],
        "supportingReceiptsInsideSourceOnly": [bind(path) for path in (STATUS, AUTHORITY, REPLAY, BASELINE, DIFFERENTIAL, REGISTRY, PROFILE_POLICY)],
        "releaseDecision": decision,
        "truthBoundary": "Exactly three main user artifacts are returned. Detailed receipts remain inside SOURCE_ONLY.",
    }
    write_json(HANDOFF, handoff)
    print(json.dumps({
        "status": "PASS_P40_CURRENT_STATE_BUILT",
        "sourceAggregateSha256": identity["sourceAggregateSha256"],
        "exactNodeBoundProfiles": "27/33",
        "candidateFieldRows": 176,
        "rightsPassed": "0/176",
        "customerOutputs": "0/17",
        "saleEligible": "0/17",
        "ledgerSha256": sha256_file(LEDGER),
        "releaseState": "NO_GO",
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
