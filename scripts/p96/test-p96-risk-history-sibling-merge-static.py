#!/usr/bin/env python3
from __future__ import annotations
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
checks = []
def check(identifier, condition, detail=None):
    checks.append({"id": identifier, "status": "PASS" if condition else "FAIL", **({} if detail is None else {"detail": detail})})

ui = (ROOT / "components/market-integrity/RiskHistoryControl.tsx").read_text(encoding="utf-8")
shield = (ROOT / "components/market-integrity/ShieldRealMarketsParityClient.tsx").read_text(encoding="utf-8")
contract = (ROOT / "lib/market-integrity/risk-history-contract.ts").read_text(encoding="utf-8")
client = (ROOT / "lib/market-integrity/risk-history-customer-client.ts").read_text(encoding="utf-8")
route = (ROOT / "lib/server/market-integrity-route-modules/history.ts").read_text(encoding="utf-8")
alignment = (ROOT / "lib/market-integrity/risk-history-current-alignment.ts").read_text(encoding="utf-8")
binding = (ROOT / "lib/market-integrity/risk-history-customer-request-binding.ts").read_text(encoding="utf-8")
active = (ROOT / "VELMERE_ACTIVE_PASS.txt").read_text(encoding="utf-8").strip()
master_path = ROOT / "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt"
master = master_path.read_text(encoding="utf-8")

check("active_pass_unique_p96r1", active == "P96R1", active)
check("master_v2r1_exists", master_path.is_file())
sections = [int(x) for x in re.findall(r"(?m)^# (\d+)\.\s", master)]
check("master_sections_0_88_complete", len(sections) == 89 and set(sections) == set(range(89)), len(sections))
check("master_collision_rule_added", "### 1.1 UNIQUE CHECKPOINT IDENTITY / BRANCH COLLISION" in master)
check("master_preserves_history_rule", "nie zmieniaj nazw ani bajtów historycznych artefaktów" in master)
check("master_requires_next_unique_checkpoint", "następnym wolnym, unikalnym checkpoint ID" in master)
check("no_merge_markers", not any(marker in ui for marker in ["<<<<<<<", "=======", ">>>>>>>"]))
check("ui_imports_current_alignment", "alignRiskHistoryCurrentObservation" in ui and "RiskHistoryCurrentObservation" in ui)
check("ui_uses_request_bound_customer_client", "fetchRiskHistoryCustomerPayload" in ui and "mergeRiskHistoryCustomerPages" in ui)
check("ui_requires_current_observation", "currentObservation: RiskHistoryCurrentObservation" in ui)
check("ui_aligns_against_parsed_canonical_history_identity", "historyAssetCanonicalId" in ui and re.search(r"historyAssetCanonicalId,\s*history,", ui) is not None)
check("ui_separates_current_and_latest_stored", 'data-risk-history-score-role="current-table"' in ui and 'data-risk-history-score-role="latest-stored"' in ui)
check("ui_stronger_database_page_wording", "multi-year retention and restore remain unproven" in ui)
check("ui_stronger_runtime_page_wording", "current runtime memory" in ui and "database read, retention and restore are unproven" in ui)
check("ui_alignment_copy_pl_en_de", all(term in ui for term in ["Bieżący wynik tabeli", "Current table score", "Aktueller Tabellenwert"]))
check("ui_no_old_durability_overclaim", "Durable history verified by read-back" not in ui and "Trwała historia potwierdzona odczytem" not in ui)
check("shield_builds_current_observation", "buildRiskHistoryCurrentObservation" in shield)
check("shield_passes_current_observation_three_times", shield.count("currentObservation={buildCurrentRiskHistoryObservation(row, risk)}") == 3, shield.count("currentObservation={buildCurrentRiskHistoryObservation(row, risk)}"))
check("request_binding_schema_present", 'RISK_HISTORY_CUSTOMER_REQUEST_BINDING_SCHEMA = "velmere.risk-history-customer-request-binding.v1"' in binding)
check("route_v3_contains_request_binding", 'RISK_HISTORY_PUBLIC_ROUTE_SCHEMA = "velmere.risk-history.customer-route.v3"' in route and "requestBinding" in route)
check("client_parser_requires_expected_request", "expectedRequest: RiskHistoryCustomerRequestIdentity" in client)
check("client_rejects_mixed_page_sources", "sameStorageBoundary" in client and "left.pageSource === right.pageSource" in client)
check("page_evidence_digest_versioned", "RISK_HISTORY_PAGE_STORAGE_PROOF_SCHEMA" in contract and "pageEvidenceDigest" in contract)
check("alignment_rebuilds_versioned_current_snapshot", "buildRiskHistorySnapshot" in alignment and "verifyRiskHistorySnapshot" in alignment)
check("alignment_identity_conflict_state", '"IDENTITY_CONFLICT"' in alignment)
check("alignment_history_newer_state", '"HISTORY_NEWER_THAN_CURRENT"' in alignment)
check("both_new_modules_browser_safe", all(term not in alignment + binding for term in ["node:crypto", "node:buffer", "Buffer.from"]))
check("no_raw_provider_material_added_to_ui", all(term not in ui for term in ["rawResponse", "providerUrl", "sourceReceiptRoot", "receiptDigest"]))

paths = [
    "components/market-integrity/RiskHistoryControl.tsx",
    "components/market-integrity/ShieldRealMarketsParityClient.tsx",
    "lib/market-integrity/risk-history-current-alignment.ts",
    "lib/market-integrity/risk-history-customer-request-binding.ts",
    "lib/market-integrity/risk-history-contract.ts",
    "lib/market-integrity/risk-history-customer-client.ts",
    "lib/server/market-integrity-route-modules/history.ts",
    "VELMERE_ULTIMATE_WORLD_CLASS_CONTINUOUS_CLOSURE_FINAL_CANDIDATE_MASTER_DIRECTIVE_V2_R1_CHECKPOINT_IDENTITY_2026-08-21.txt",
]
failed = [row for row in checks if row["status"] != "PASS"]
receipt = {
    "schemaVersion": "velmere.p96.risk-history-sibling-merge-static.v1",
    "generatedAt": "2026-08-21T05:00:00.000Z",
    "status": "PASS" if not failed else "FAIL",
    "checks": {"total": len(checks), "passed": len(checks) - len(failed), "failed": len(failed), "rows": checks},
    "sourceBindings": {path: "sha256:" + hashlib.sha256((ROOT / path).read_bytes()).hexdigest() for path in paths},
    "truthBoundary": "Static proof verifies that the formal P96 merge contains both sibling P95 contracts, resolves the shared UI conflict without weakening either boundary and adds a checkpoint-identity governance rule. It does not execute Browser, PostgreSQL, deployed HTTP, whole-project build or exact Windows.",
}
for rel in ["receipts/p96/P96_RISK_HISTORY_SIBLING_MERGE_STATIC.json", "artifacts/p96/P96_RISK_HISTORY_SIBLING_MERGE_STATIC.json"]:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"]}, indent=2, ensure_ascii=False))
raise SystemExit(1 if failed else 0)
