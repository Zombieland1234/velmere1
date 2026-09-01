#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_RECEIPT = ROOT / "receipts/p94/P94_FAILURE_ADJUDICATION.json"
OUT_ARTIFACT = ROOT / "artifacts/p94/P94_FAILURE_ADJUDICATION.json"
GENERATED_AT = "2026-08-21T00:10:00.000Z"


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


rows = [
    {
        "id": "P94_RUNTIME_001_TEST_FIXTURE_SNAPSHOT_INSTEAD_OF_EVENT",
        "log": "artifacts/p94/logs/failures/P94_RUNTIME_001_TEST_FIXTURE_SNAPSHOT_INSTEAD_OF_EVENT.log",
        "classification": "TEST_FIXTURE_DEFECT_ZERO_CREDIT",
        "rootCause": "The negative test supplied a RiskHistorySnapshotRecord where the production boundary requires a verified RiskHistoryEvent.",
        "repair": "Use the actual WITHHELD event from the internal canonical history and rerun the complete runtime suite from the beginning.",
        "replacementProof": "receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_RUNTIME.json",
        "replacementStatus": "PASS_BOUNDED_NO_SOCKET_PUBLIC_ONLY_PAGINATION",
        "replacementChecks": 62,
    },
    {
        "id": "P94_STATIC_001_FALSE_POSITIVE_REQUEST_BINDING_CALL_VS_RESPONSE",
        "log": "artifacts/p94/logs/failures/P94_STATIC_001_FALSE_POSITIVE_REQUEST_BINDING_CALL_VS_RESPONSE.log",
        "classification": "STATIC_HARNESS_FALSE_POSITIVE_ZERO_CREDIT",
        "rootCause": "The assertion searched the entire route source for requestBinding and confused the internal builder argument with a customer response field.",
        "repair": "Parse the returned response object boundary and verify that requestBinding is consumed internally but not serialized to the public route payload.",
        "replacementProof": "receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_STATIC.json",
        "replacementStatus": "PASS",
        "replacementChecks": 111,
    },
    {
        "id": "P94_STATIC_002_SCHEMA_SOURCE_DIVERGENCE",
        "log": "artifacts/p94/logs/failures/P94_STATIC_002_SCHEMA_PARITY_EXPECTATION_TOO_STRICT.log",
        "classification": "REAL_SCHEMA_MIGRATION_DIVERGENCE_FIXED_ZERO_INITIAL_CREDIT",
        "rootCause": "The ordered P94 migration contained the final public request binding and STABLE time semantics, while lib/db/schema.sql still contained the earlier body without the same guarantees. The failure was not merely a strict test expectation despite the historical log filename.",
        "repair": "Replace the schema-file function body with the exact ordered migration body and verify source parity.",
        "replacementProof": "receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_STATIC.json",
        "replacementStatus": "PASS",
        "replacementChecks": 111,
    },
    {
        "id": "P94_TYPESCRIPT_003_INITIAL_PUBLIC_BINDING_INFERENCE_FIXED",
        "log": "artifacts/p94/logs/failures/P94_TYPESCRIPT_003_INITIAL_PUBLIC_BINDING_INFERENCE_FIXED.log",
        "classification": "REAL_TYPE_INFERENCE_DEFECT_FIXED_ZERO_INITIAL_CREDIT",
        "rootCause": "requestBinding.resolutionKind widened to string | null after validation instead of the closed CANONICAL | UNIQUE_ALIAS | null union.",
        "repair": "Add the exact RiskHistoryPublicRequestBinding return type at the parser boundary and rerun all four targeted strict TypeScript configurations.",
        "replacementProof": "receipts/p94/P94_TARGETED_STRICT_TYPESCRIPT.json",
        "replacementStatus": "PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT",
        "replacementChecks": 4,
    },
    {
        "id": "P94_TYPESCRIPT_001_P93_AMBIENT_SUPERSEDED",
        "log": "artifacts/p94/logs/failures/P94_TYPESCRIPT_001_P93_AMBIENT_SUPERSEDED.log",
        "classification": "SUPERSEDED_AMBIENT_CONTRACT_NO_CREDIT",
        "rootCause": "The frozen P93 ambient declaration does not contain the new P94 public pagination types and reader.",
        "repair": "Preserve P93 history unchanged and use the closed P94 server ambient for current-byte proof.",
        "replacementProof": "receipts/p94/P94_TARGETED_STRICT_TYPESCRIPT.json",
        "replacementStatus": "PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT",
        "replacementChecks": 4,
    },
    {
        "id": "P94_TYPESCRIPT_002_P92_UI_AMBIENT_SUPERSEDED",
        "log": "artifacts/p94/logs/failures/P94_TYPESCRIPT_002_P92_UI_AMBIENT_SUPERSEDED.log",
        "classification": "SUPERSEDED_AMBIENT_CONTRACT_NO_CREDIT",
        "rootCause": "The frozen P92 UI ambient predates cursors, page merging and safe merged-event caps.",
        "repair": "Preserve P92 history unchanged and use the closed P94 UI ambient for current-byte proof.",
        "replacementProof": "receipts/p94/P94_TARGETED_STRICT_TYPESCRIPT.json",
        "replacementStatus": "PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT",
        "replacementChecks": 4,
    },
    {
        "id": "P94_REGRESSION_001_P91_LEDGER_RPC_V1_SUPERSEDED",
        "log": "artifacts/p94/logs/failures/P94_REGRESSION_001_P91_LEDGER_RPC_V1_SUPERSEDED.log",
        "classification": "SUPERSEDED_V1_READER_CONTRACT_NO_CREDIT",
        "rootCause": "The historical P91 ledger runtime expects the retired v1 canonical reader, while the production shared reader correctly uses the P93 v2 contract.",
        "repair": "Retain the frozen P91 failure with zero current credit and rerun the P91 event contract plus P93 durable/cross-product current-byte compatibility proofs.",
        "replacementProof": "receipts/p94/P94_CURRENT_BYTE_REGRESSION.json",
        "replacementStatus": "PASS_BOUNDED_CURRENT_BYTE_AFFECTED_SCOPE_REGRESSION",
        "replacementChecks": 308,
    },
]

for row in rows:
    log_path = ROOT / row["log"]
    proof_path = ROOT / row["replacementProof"]
    if not log_path.is_file() or not proof_path.is_file():
        raise RuntimeError(f"missing_failure_or_proof:{row['id']}")
    proof = json.loads(proof_path.read_text(encoding="utf-8"))
    if proof.get("status") != row["replacementStatus"]:
        raise RuntimeError(f"replacement_status:{row['id']}:{proof.get('status')}")
    if row["replacementProof"].endswith("P94_CURRENT_BYTE_REGRESSION.json"):
        count = proof.get("checks", {}).get("total")
    else:
        count = proof.get("checks", {}).get("total")
    if count != row["replacementChecks"]:
        raise RuntimeError(f"replacement_count:{row['id']}:{count}")
    row["logBytes"] = log_path.stat().st_size
    row["logSha256"] = sha(log_path)
    row["replacementProofSha256"] = sha(proof_path)
    row["credit"] = 0
    row["adjudicated"] = True

payload = {
    "schemaVersion": "velmere.p94.failure-adjudication.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_COMPLETE_FAILURE_ADJUDICATION_ZERO_CREDIT",
    "failures": {"total": len(rows), "adjudicated": len(rows), "unadjudicated": 0, "rows": rows},
    "replacementProofs": sorted({row["replacementProof"] for row in rows}),
    "zeroFakeCredit": {
        "firstFailuresPreserved": True,
        "nonzeroRunsCredited": False,
        "supersededHarnessesRewritten": False,
        "retryUntilGreenCredited": False,
    },
    "truthBoundary": "Seven first failures or superseded contracts are preserved with zero credit. Replacement PASS applies only to the explicitly rerun bounded scope and does not erase the original result or grant Browser, PostgreSQL, exact-Windows or Customer FINAL credit.",
}
for path in (OUT_RECEIPT, OUT_ARTIFACT):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": payload["status"], "failures": len(rows), "unadjudicated": 0, "receiptSha256": sha(OUT_RECEIPT)}, indent=2))
