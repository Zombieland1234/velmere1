#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXED = "2026-08-21T08:20:00.000Z"

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

cases = [
    {
        "id": "P97_PRODUCT_001_BROWSER_BASIC_NON_DURABLE_PRODUCTION_PATH",
        "classification": "PRODUCT_ARTIFACT_INTEGRITY_DEFECT",
        "firstResult": "SOURCE_REVIEW_FAIL_CLOSED",
        "credit": 0,
        "evidence": "artifacts/p97/P97_BROWSER_BASIC_DURABLE_PDF_STATIC.json",
        "rootCause": "The P96 Browser PDF route set requireDurableStore=false for Basic, allowing a production Basic PDF to be rendered and returned without a mandatory durable canonical blob.",
        "adjudication": "P97 applies one durable render-once/store-first policy to Basic, Pro and Advanced. Production without the durable store now fails before rendering; local memory remains explicitly bounded and not FINAL.",
    },
    {
        "id": "P97_PRODUCT_002_TEXT_HASH_USED_FOR_BINARY_PDF",
        "classification": "PRODUCT_CRYPTOGRAPHIC_BINDING_DEFECT",
        "firstResult": "SOURCE_REVIEW_FAIL",
        "credit": 0,
        "evidence": "artifacts/p97/P97_BROWSER_BASIC_DURABLE_PDF_RUNTIME.json",
        "rootCause": "The first P97 route patch passed a Buffer through the text-oriented digest helper instead of hashing exact PDF bytes.",
        "adjudication": "Replaced with sha256BytesDigest and added binary negative controls that distinguish exact byte hashing from text hashing.",
    },
    {
        "id": "P97_RUNTIME_001_ASCII_FIXTURE_FALSE_NEGATIVE",
        "classification": "TEST_FIXTURE_DEFECT",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p97/logs/failures/P97_RUNTIME_001_ASCII_FIXTURE_CAPTURE_NOTE.json",
        "rootCause": "The first negative fixture contained ASCII-only bytes, so the old text-hash and exact byte-hash paths produced the same digest and the control could not expose the defect.",
        "adjudication": "Changed only the fixture to include binary bytes; kept the exact-byte requirement. Current runtime passes 43/43.",
    },
    {
        "id": "P97_STATIC_001_INTERNAL_VERIFIER_FALSE_LEAK_ASSERTION",
        "classification": "TEST_HARNESS_FALSE_POSITIVE",
        "firstResult": "FAIL_65_OF_66",
        "credit": 0,
        "evidence": "artifacts/p97/logs/failures/p97-static-second.log",
        "rootCause": "A broad static string assertion treated the server-side receipt verifier argument as if it were a customer payload field.",
        "adjudication": "Replaced the broad string match with checks against actual response headers/payload construction; no product security requirement was weakened. Current static passes 66/66.",
    },
    {
        "id": "P97_ENV_001_A83_EXTERNAL_FONT_MISSING",
        "classification": "EXTERNAL_ENVIRONMENT_BLOCKER",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p97/logs/12_A83_BROWSER_LENS_MATRIX.log",
        "rootCause": "The rendered Browser/Lens matrix requires the licensed exact external font path, which is absent in the current execution environment.",
        "adjudication": "Rendered Browser/PDF typography credit remains WITHHELD. No font was embedded, copied or shared, and no fallback was counted as exact proof.",
    },
    {
        "id": "P97_TEST_001_A72_MISSING_TYPESCRIPT_LOADER",
        "classification": "TEST_INVOCATION_DEFECT",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p97/logs/13_DOWNLOAD_RESPONSE_BOUNDARY.log",
        "rootCause": "The first historical A72 invocation ran a TypeScript import without the canonical offline loader.",
        "adjudication": "Reran with the loader. The invocation failure receives zero credit.",
    },
    {
        "id": "P97_TEST_002_A72_SUPERSEDED_ROUTE_COVERAGE_ASSERTION",
        "classification": "SUPERSEDED_HISTORICAL_HARNESS",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p97/logs/13_DOWNLOAD_RESPONSE_BOUNDARY_RERUN.log",
        "rootCause": "The old harness required a retired source-text coverage pattern in the Audit customer-safe report route, while current code uses the stronger exact delivery boundary.",
        "adjudication": "No current PASS is claimed from A72. P97 relies on current Browser byte-binding and durable artifact proofs instead.",
    },
    {
        "id": "P97_TEST_003_P86_LATEST_MIGRATION_ASSERTION",
        "classification": "SUPERSEDED_HISTORICAL_HARNESS",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p97/logs/14_P86_EXACT_PDF_STATIC.log",
        "rootCause": "P86 asserts that its migration remains the latest ordered migration, which is intentionally false after P91/P93/P94.",
        "adjudication": "No current credit is granted from this stale ordering assertion; later migration chain truth remains unchanged.",
    },
    {
        "id": "P97_TEST_004_P88_PRE_P89_PROVIDER_MODEL",
        "classification": "SUPERSEDED_HISTORICAL_HARNESS",
        "firstResult": "FAIL",
        "credit": 0,
        "evidence": "artifacts/p97/logs/16_P88_AUDIT_EXACT_PDF.log",
        "rootCause": "P88 runtime fixtures encode the pre-P89 provider evidence-dimension schema and are rejected by the current P89/P90 model.",
        "adjudication": "No P88 runtime credit is inherited. The failure is unrelated to the P97 Browser Basic artifact repair.",
    },
]
for case in cases:
    path = ROOT / case["evidence"]
    case["evidencePresent"] = path.is_file()
    case["evidenceSha256"] = "sha256:" + sha(path) if path.is_file() else None
all_present = all(c["evidencePresent"] for c in cases)
receipt = {
    "schemaVersion": "velmere.p97.failure-adjudication.v1",
    "generatedAt": FIXED,
    "status": "PASS_ALL_MATERIAL_FAILURES_PRESERVED_AND_ADJUDICATED" if all_present else "FAIL",
    "cases": cases,
    "summary": {
        "total": len(cases),
        "preservedEvidence": sum(1 for c in cases if c["evidencePresent"]),
        "creditedFailures": sum(1 for c in cases if c["credit"] != 0),
        "unresolved": sum(1 for c in cases if not c["evidencePresent"]),
    },
    "zeroFakeCredit": {
        "failedRunsCounted": False,
        "retryUntilGreen": False,
        "supersededHarnessesCounted": False,
        "renderedBrowserClaimed": False,
        "customerFinal": "0/20",
    },
    "truthBoundary": "Preserves and adjudicates material P97 source, test, supersession and environment failures. A later green rerun does not erase the first failure; failed and superseded executions receive zero PASS credit.",
}
for rel in ["receipts/p97/P97_FAILURE_ADJUDICATION.json", "artifacts/closure/p97r1/P97R1_FAILURE_ADJUDICATION.json"]:
    target = ROOT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "summary": receipt["summary"]}, indent=2))
raise SystemExit(0 if all_present else 1)
