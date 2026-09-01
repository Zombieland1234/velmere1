#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[2]
checks = []

def check(identifier, condition, detail=None):
    row = {"id": identifier, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)
    if not condition:
        raise AssertionError(f"P95 static failed: {identifier}: {detail!r}")

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

binding = text("lib/market-integrity/risk-history-customer-request-binding.ts")
contract = text("lib/market-integrity/risk-history-contract.ts")
client = text("lib/market-integrity/risk-history-customer-client.ts")
route = text("lib/server/market-integrity-route-modules/history.ts")
ui = text("components/market-integrity/RiskHistoryControl.tsx")
active = text("VELMERE_ACTIVE_PASS.txt").strip()

# Request binding.
check("binding:dedicated-module", "RISK_HISTORY_CUSTOMER_REQUEST_BINDING_SCHEMA" in binding)
check("binding:asset-reference-digest", "RISK_HISTORY_CUSTOMER_ASSET_REFERENCE_SCHEMA" in binding and "requestedId: normalized.requestedId" in binding)
check("binding:page-reference-digest", "RISK_HISTORY_CUSTOMER_PAGE_REFERENCE_SCHEMA" in binding and "requestedLimit" in binding and "before" in binding)
check("binding:canonical-lowercase-id", '.trim().toLowerCase()' in binding)
check("binding:strict-asset-limit-cursor-validation", all(term in binding for term in ["ASSET_ID.test", "requestedLimit < 1", "requestedLimit > MAX_PUBLIC_EVENTS", "canonicalIso(before)"]))
check("binding:closed-shape", "verifyRiskHistoryCustomerRequestBindingShape" in binding and "expectedKeys" in binding)
check("binding:recompute-not-self-consistency", "computed = buildRiskHistoryCustomerRequestBinding(expected)" in binding)
check("binding:no-raw-id-output-field", "requestedId: string;" not in binding.split("export type RiskHistoryCustomerRequestBinding", 1)[1].split("};", 1)[0])
check("binding:portable-shared-hash", 'from "@/lib/security/canonical-json"' in binding and 'from "@/lib/security/cryptographic-digest"' in binding)

# Contract and page evidence proof.
check("contract:public-schema-v3", 'RISK_HISTORY_PUBLIC_CUSTOMER_SCHEMA = "velmere.risk-history.customer.v3"' in contract)
check("contract:page-storage-schema-v2", 'RISK_HISTORY_PAGE_STORAGE_PROOF_SCHEMA = "velmere.risk-history-page-storage-proof.v2"' in contract)
check("contract:page-proof-separate-type", "CustomerSafeRiskHistoryPageStorageProof" in contract and 'pageSource: "DATABASE" | "MEMORY"' in contract)
check("contract:no-durable-retention-claim", "durableRetentionClaimed: false" in contract)
check("contract:no-backup-restore-claim", "backupRestoreProven: false" in contract)
check("contract:database-page-response-not-durability", '"DATABASE_PAGE_RESPONSE_VERIFIED"' in contract and '"DURABLE_VERIFIED"' not in contract.split("export type CustomerSafeRiskHistoryPageStorageProof", 1)[1].split("};", 1)[0])
check("contract:page-evidence-includes-request-binding", "buildRiskHistoryPageEvidenceDigest" in contract and "requestBinding: args.requestBinding" in contract)
check("contract:page-evidence-includes-source-resolution-canonical-page-events", all(term in contract for term in ["pageSource: args.pageSource", "resolution: args.resolution", "canonicalAssetId: args.canonicalAssetId", "page: args.page", "events: args.events"]))
check("contract:page-event-order-and-uniqueness", "timestamp <= previous" in contract and "seen.has(event.eventReference)" in contract)
check("contract:memory-proof-has-database-blocker", '"database_page_read_not_verified"' in contract)
check("contract:all-page-proofs-withhold-retention-restore", '"multi_year_retention_not_proven"' in contract and '"backup_restore_not_proven"' in contract)
check("contract:public-projection-overrides-old-storage", 'Omit<CustomerRiskHistoryProjection, "schemaVersion" | "storage">' in contract)
check("contract:public-limitations-do-not-claim-durable-history", "Multi-year retention and backup restoration are not claimed by this bounded page read." in contract)

# Route.
check("route:v3", 'RISK_HISTORY_PUBLIC_ROUTE_SCHEMA = "velmere.risk-history.customer-route.v3"' in route)
check("route:builds-customer-binding", "buildRiskHistoryCustomerRequestBinding({ assetId: id, limit, before })" in route)
check("route:returns-binding", "requestBinding," in route.split("return routeJson({", 1)[1])
check("route:uses-resolution-source-for-page-proof", "pageSource: resolution.source" in route)
check("route:binds-event-references", "eventReference: event.eventDigest" in route and "observedAt: event.observedAt" in route)
check("route:no-global-storage-status-import", "getCustomerSafeRiskLedgerStatus" not in route)
check("route:no-process-global-promise-all", "Promise.all" not in route)
check("route:still-fail-closed", 'error: "risk_history_temporarily_unavailable"' in route and ", 503" in route)
check("route:bounded-query-contract-preserved", all(term in route for term in ["ALLOWED_QUERY_KEYS", "PUBLIC_HISTORY_MAX_EVENTS = 144", "risk_history_limit_invalid", "risk_history_cursor_invalid"]))
check("route:rate-limit-preserved", "applyApiRateLimit" in route and "risk-history-public-read" in route)

# Client boundary.
check("client:route-v3", 'RISK_HISTORY_CUSTOMER_ROUTE_SCHEMA = "velmere.risk-history.customer-route.v3"' in client)
check("client:projection-v3", 'RISK_HISTORY_PUBLIC_CUSTOMER_SCHEMA = "velmere.risk-history.customer.v3"' in client)
check("client:parser-requires-expected-request", "expectedRequest: RiskHistoryCustomerRequestIdentity" in client)
check("client:top-level-closed-binding", '["schemaVersion", "mode", "requestBinding", "publication", "riskHistory", "generatedAt"]' in client)
check("client:cryptographic-binding-verifier", "verifyRiskHistoryCustomerRequestBinding(input.requestBinding, expectedRequest)" in client)
check("client:fetch-passes-exact-asset-limit-cursor", "parseRiskHistoryCustomerPayload(raw, { assetId: args.assetId, limit, before })" in client)
check("client:strict-page-storage-fields", all(term in client for term in ["pageSource", "pageReadState", "pageIntegrityVerified", "durableRetentionClaimed", "backupRestoreProven", "pageEvidenceDigest"]))
check("client:recomputes-page-evidence", "expectedPageEvidenceDigest = buildRiskHistoryPageEvidenceDigest" in client)
check("client:rejects-storage-overclaims", "value.storage.durableRetentionClaimed !== false" in client and "value.storage.backupRestoreProven !== false" in client)
check("client:old-global-storage-contract-removed", all(term not in client for term in ["STORAGE_STATES", "COMPLETENESS_STATES", 'storageState: value.storage.storageState', 'historyCompleteness: value.storage.historyCompleteness']))
check("client:merge-same-asset-reference", "page.requestBinding.assetReference !== assetReference" in client)
check("client:merge-page-reference-uniqueness", "pageReferences.has(page.requestBinding.pageReference)" in client)
check("client:merge-cursor-chain", "page.requestBinding.before !== previous?.riskHistory.window.nextBefore" in client)
check("client:merge-rejects-source-mixing", "sameStorageBoundary" in client and "left.pageSource === right.pageSource" in client)
check("client:page-digest-not-required-identical-across-pages", "left.pageEvidenceDigest === right.pageEvidenceDigest" not in client)
check("client:same-origin-no-store-preserved", 'cache: "no-store"' in client and 'credentials: "same-origin"' in client)
check("client:bounded-response-preserved", "RISK_HISTORY_CUSTOMER_MAX_RESPONSE_BYTES = 512 * 1024" in client)

# Customer UI truth.
check("ui:database-page-wording-bounded", "multi-year retention and restore remain unproven" in ui)
check("ui:runtime-page-wording-bounded", "current runtime memory" in ui and "database read, retention and restore are unproven" in ui)
check("ui:storage-label-uses-page-proof", 'storage?.pageSource === "DATABASE"' in ui and 'storage.pageReadState === "DATABASE_PAGE_RESPONSE_VERIFIED"' in ui)
check("ui:no-old-global-storage-fields", ".storageState" not in ui and ".historyCompleteness" not in ui)
check("ui:pl-en-de-copy", all(term in ui for term in ["retencja wieloletnia", "multi-year retention", "Langzeitaufbewahrung"]))
check("ui:no-durable-history-overclaim", "Durable history verified by read-back" not in ui and "Trwała historia potwierdzona odczytem" not in ui)

# Current pass and source hygiene.
check("active-pass:p96r1", active == "P96R1", active)
check("source:no-node-only-import-in-new-shared-module", all(term not in binding for term in ['node:crypto', 'node:buffer', 'Buffer.from']))
check("source:no-raw-provider-or-private-payload-added", all(term not in route for term in ["rawResponse", "providerUrl", "sourceReceiptRoot", "snapshotDigest"]))

failed = [row for row in checks if row["status"] != "PASS"]
source_paths = [
    "lib/market-integrity/risk-history-customer-request-binding.ts",
    "lib/market-integrity/risk-history-contract.ts",
    "lib/market-integrity/risk-history-customer-client.ts",
    "lib/server/market-integrity-route-modules/history.ts",
    "components/market-integrity/RiskHistoryControl.tsx",
    "VELMERE_ACTIVE_PASS.txt",
]
receipt = {
    "schemaVersion": "velmere.p96.risk-history-request-storage-static.v1",
    "generatedAt": "2026-08-21T00:00:00.000Z",
    "status": "PASS" if not failed else "FAIL",
    "checks": {
        "total": len(checks),
        "passed": len(checks) - len(failed),
        "failed": len(failed),
        "rows": checks,
    },
    "sourceBindings": {
        path: "sha256:" + hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        for path in source_paths
    },
    "truthBoundary": "Static proof validates the P95 cryptographic request-binding contract, exact page-evidence digest inputs, per-page DATABASE/MEMORY provenance, rejection of global durability inheritance, strict customer parsing, page-chain merge rules and bounded PL/EN/DE customer wording. It does not execute PostgreSQL, render a Browser, prove retention or restore, deploy HTTP, run exact Windows or establish Customer FINAL.",
}
for target in [
    ROOT / "receipts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_STATIC.json",
    ROOT / "artifacts/p96/P96_RISK_HISTORY_REQUEST_STORAGE_STATIC.json",
]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"]}, indent=2, ensure_ascii=False))
if failed:
    raise SystemExit(1)
