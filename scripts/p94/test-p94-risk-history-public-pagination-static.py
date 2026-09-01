#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
checks: list[dict[str, object]] = []

def check(check_id: str, condition: bool, detail: object | None = None) -> None:
    row: dict[str, object] = {"id": check_id, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)
    if not condition:
        raise AssertionError(f"P94 static failed: {check_id}: {detail!r}")

def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

contract = text("lib/market-integrity/risk-history-contract.ts")
ledger = text("lib/market-integrity/risk-ledger.ts")
route = text("lib/server/market-integrity-route-modules/history.ts")
client = text("lib/market-integrity/risk-history-customer-client.ts")
ui = text("components/market-integrity/RiskHistoryControl.tsx")
migration = text("supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql")
schema = text("lib/db/schema.sql")
active = text("VELMERE_ACTIVE_PASS.txt").strip()

# Contract/version truth.
check("contract:public-v2", 'RISK_HISTORY_PUBLIC_CUSTOMER_SCHEMA = "velmere.risk-history.customer.v2"' in contract)
check("contract:window-v1", 'RISK_HISTORY_CUSTOMER_WINDOW_SCHEMA = "velmere.risk-history.customer-window.v1"' in contract)
check("contract:explicit-request-binding", "RiskHistoryPublicRequestBinding" in contract and "resolutionKind" in contract)
check("contract:public-page-fields", all(token in contract for token in ["requestedLimit", "before", "hasOlder", "nextBefore"]))
check("contract:window-completeness-fields", all(token in contract for token in ["isLatestWindow", "reachesTrackingStart", "completeVisibleHistory", "oldestIncludedAt", "newestIncludedAt"]))
check("contract:public-builder", "buildPublicCustomerRiskHistoryProjection" in contract)
check("contract:public-only-boundary", 'event.publicationState !== "PUBLIC"' in contract and "!event.customerPublishable" in contract)
check("contract:canonical-identity-isolation", "risk_history_public_identity_mix" in contract)
check("contract:duplicate-event-rejection", "risk_history_public_duplicate_event" in contract)
check("contract:exclusive-cursor-boundary", "risk_history_public_cursor_boundary_invalid" in contract)
check("contract:cursor-equals-oldest", "risk_history_public_next_cursor_invalid" in contract)
check("contract:tracking-start-only-when-reached", "trackingStartedAt: reachesTrackingStart ? firstPublic.observedAt : null" in contract)
check("contract:latest-and-start-required-for-complete", "args.page.before === null && reachesTrackingStart" in contract)
check("contract:non-enumerating-empty", "No customer-publishable risk history is available for this request." in contract)
check("contract:private-existence-copy-absent-from-public-v2", "Stored observations exist" not in contract[contract.index("function emptyPublicRiskHistoryProjection"):])
check("contract:not-probability", "probabilityPercent: null" in contract and "isProbability: false" in contract)

# Ledger application and no-socket database boundary.
check("ledger:public-resolution-version", 'RISK_HISTORY_PUBLIC_RESOLUTION_SCHEMA = "velmere.risk-history-public-resolution.v1"' in ledger)
check("ledger:dedicated-public-reader", "getPublicRiskHistoryResolution" in ledger)
check("ledger:dedicated-public-rpc", '"velmere_read_public_risk_history_by_asset_v1"' in ledger)
check("ledger:bounded-public-cap", "PUBLIC_RISK_HISTORY_MAX_EVENTS = 144" in ledger)
check("ledger:internal-cap-separate", "INTERNAL_RISK_HISTORY_MAX_EVENTS = 5_000" in ledger)
check("ledger:memory-public-filter-before-slice", ledger.index(".filter((event) => event.customerPublishable") < ledger.index(".slice(0, limit + 1)", ledger.index("function memoryPublicRiskHistoryResolution")))
check("ledger:memory-exclusive-cursor", "Date.parse(event.observedAt) < beforeMs" in ledger)
check("ledger:memory-limit-plus-one", ".slice(0, limit + 1)" in ledger)
check("ledger:old-only-alias-scans-history", "history.some((event) => event.assetId.toLowerCase() === requested)" in ledger)
check("ledger:exact-precedes-alias", "canonicalMatches.size > 0 ? canonicalMatches : aliasMatches" in ledger)
check("ledger:ambiguous-empty-public", "if (candidates.size !== 1) return empty();" in ledger)
check("ledger:request-binding-parsed", "parsePublicRequestBinding" in ledger)
check("ledger:page-parsed-strictly", "parsePublicPage" in ledger)
check("ledger:closed-public-envelope", "PUBLIC_RESOLUTION_FIELDS" in ledger and "exactRecordFields(value, PUBLIC_RESOLUTION_FIELDS)" in ledger)
check("ledger:database-outage-no-memory-fallback", 'throw new Error("risk_history_public_resolution_unavailable")' in ledger)
check("ledger:public-read-no-durability-credit", "Public reads are deliberately not mirrored into durability credit" in ledger)
check("ledger:request-body-binds-cursor", "{ p_asset_id: clean, p_limit: limit, p_before: before }" in ledger)
check("ledger:nonprogressing-cursor-rejected", "Date.parse(page.nextBefore) >= Date.parse(expectedBefore)" in ledger)
check("ledger:public-event-boundary-verified", "event.customerPublishable && event.publicationState === \"PUBLIC\"" in ledger or "!event.customerPublishable" in ledger)

# Public HTTP route.
check("route:v2-schema", 'RISK_HISTORY_PUBLIC_ROUTE_SCHEMA = "velmere.risk-history.customer-route.v2"' in route)
check("route:physical-schema-field", "schemaVersion: RISK_HISTORY_PUBLIC_ROUTE_SCHEMA" in route)
check("route:uses-public-reader", "getPublicRiskHistoryResolution" in route)
check("route:does-not-use-internal-reader", "getPersistentRiskHistoryResolution" not in route and "getPersistentRiskHistoryEvents" not in route)
check("route:allowed-query-is-closed", 'new Set(["id", "limit", "before"])' in route)
check("route:duplicate-query-rejected", "url.searchParams.getAll(key).length > 1" in route)
check("route:cursor-canonical-iso", "canonicalIso(before)" in route)
check("route:future-cursor-skew-bounded", "MAX_CURSOR_CLOCK_SKEW_MS" in route)
check("route:limit-144", "PUBLIC_HISTORY_MAX_EVENTS = 144" in route)
check("route:request-size-bound", "2_048" in route and "risk_history_request_too_large" in route)
check("route:rate-limit", "PUBLIC_HISTORY_RATE_LIMIT = 36" in route and "applyApiRateLimit" in route)
check("route:one-generated-at", "const generatedAt = new Date().toISOString()" in route)
check("route:no-live-claim", "liveClaimed: false" in route)
check("route:customer-safe-503", "risk_history_temporarily_unavailable" in route)
route_success_payload = route[route.index("return routeJson({\n      schemaVersion: RISK_HISTORY_PUBLIC_ROUTE_SCHEMA"):route.index("}, 200, rateLimit.headers)")]
check("route:request-binding-not-returned", "requestBinding:" not in route_success_payload)

# Strict client/parser/merge/chart.
check("client:v2-route", 'RISK_HISTORY_CUSTOMER_ROUTE_SCHEMA = "velmere.risk-history.customer-route.v2"' in client)
check("client:v2-projection", 'RISK_HISTORY_PUBLIC_CUSTOMER_SCHEMA = "velmere.risk-history.customer.v2"' in client)
check("client:strict-top-level-fields", 'exactKeys(input, ["schemaVersion", "mode", "publication", "riskHistory", "generatedAt"])' in client)
check("client:strict-window-fields", "completeVisibleHistory" in client and "oldestIncludedAt" in client and "newestIncludedAt" in client)
check("client:window-has-older-invariant", "value.hasOlder !== (value.nextBefore !== null)" in client)
check("client:latest-window-invariant", "value.isLatestWindow !== (value.before === null)" in client)
check("client:completeness-invariant", 'value.completeVisibleHistory !== (status === "AVAILABLE" && value.isLatestWindow && value.reachesTrackingStart)' in client)
check("client:cursor-boundary", "Date.parse(value.newestIncludedAt) >= Date.parse(value.before)" in client)
check("client:strict-event-order", "time <= previousTime" in client)
check("client:duplicate-event-reference", "seenEvents.has(row.eventReference)" in client)
check("client:segments-recomputed", "buildSegments(parsedHistory)" in client and "sameSegments" in client)
check("client:same-origin-fetch", "fetchSameOriginWithDeadline" in client and 'credentials: "same-origin"' in client)
check("client:no-store", 'cache: "no-store"' in client)
check("client:bounded-response", "RISK_HISTORY_CUSTOMER_MAX_RESPONSE_BYTES" in client)
check("client:cursor-path", 'query.set("before", before)' in client)
check("client:page-chain", "page.riskHistory.window.before !== previous?.riskHistory.window.nextBefore" in client)
check("client:storage-consistency", "sameStorage" in client)
check("client:merged-event-cap", "RISK_HISTORY_CUSTOMER_MAX_MERGED_EVENTS = 5_000" in client)
check("client:merged-strict-order", "time <= previousTime || seen.has(row.eventReference)" in client)
check("client:tracking-start-from-oldest-page", "reachesTrackingStart ? history[0]?.observedAt ?? null : null" in client)
check("client:chart-uses-timestamps", "const timestamps = history.map((row) => Date.parse(row.observedAt))" in client)
check("client:chart-time-ratio", "(timestamps[index]! - minimumTime) / timeSpan" in client)
check("client:chart-rejects-nonmonotonic", "timestamps[index]! <= timestamps[index - 1]!" in client)

# UI truth/accessibility/intentional pagination.
check("ui:imports-merge", "mergeRiskHistoryCustomerPages" in ui)
check("ui:imports-safe-caps", "RISK_HISTORY_CUSTOMER_MAX_EVENTS" in ui and "RISK_HISTORY_CUSTOMER_MAX_MERGED_EVENTS" in ui)
check("ui:deliberate-load-older", "const loadOlder = useCallback" in ui and "onClick={() => void loadOlder()}" in ui)
check("ui:cursor-bound-fetch", "fetchRiskHistoryCustomerPayload({ assetId, before, limit: pageLimit" in ui)
check("ui:merge-before-commit", "if (!mergeRiskHistoryCustomerPages(candidate))" in ui)
check("ui:merged-cap-enforced", "remainingCapacity" in ui and "historyLimitReached" in ui)
check("ui:truthful-visible-wording", all(phrase in ui for phrase in ["Widoczna oś czasu", "Visible timeline", "Sichtbare Zeitleiste"]))
check("ui:no-full-history-claim", all(phrase not in ui for phrase in ["Full history", "Pełna historia", "Vollständiger Verlauf"]))
check("ui:bounded-disclosure", "boundedWindow" in ui and "completeTimeline" in ui)
check("ui:cap-disclosure", "historyLimitReached" in ui)
check("ui:chart-uses-customer-helper", "buildRiskHistoryChartPolyline(history" in ui)
check("ui:dialog-semantics", 'role="dialog"' in ui and 'aria-modal="true"' in ui and "aria-labelledby" in ui and "aria-describedby" in ui)
check("ui:focus-boundary", "useDialogFocusBoundary" in ui)
check("ui:reduced-motion", "motion-reduce:animate-none" in ui)
check("ui:retry-user-action", "onClick={() => void load(true)}" in ui)
check("ui:no-raw-evidence-render", all(term not in ui for term in ["sourceReceiptRoot", "providerUrl", "rawResponse", "snapshotDigest"]))
check("ui:not-probability", "notProbability" in ui)

# SQL migration/database contract.
check("migration:transaction", migration.startswith("begin;") and migration.rstrip().endswith("commit;"))
check("migration:ordered-name", (ROOT / "supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql").is_file())
check("migration:dedicated-public-rpc", "velmere_read_public_risk_history_by_asset_v1" in migration)
check("migration:stable", "language plpgsql\nstable\nsecurity definer" in migration)
check("migration:fixed-search-path", "set search_path = pg_catalog, public, pg_temp" in migration)
check("migration:input-validation", "p_limit > 144" in migration and "p_before > now() + interval '5 minutes'" in migration)
check("migration:exact-before-alias", migration.index("when exact_count = 1") < migration.index("when alias_count = 1"))
check("migration:public-filter-before-limit", migration.index("and customer_publishable") < migration.index("limit p_limit + 1"))
check("migration:publication-state-filter", "and publication_state = 'PUBLIC'" in migration)
check("migration:exclusive-cursor", "observed_at < p_before" in migration)
check("migration:limit-plus-one", "limit p_limit + 1" in migration)
check("migration:ascending-customer-json", "jsonb_agg(event_json order by observed_at)" in migration)
check("migration:private-empty-normalization", "private-only/exhausted pages share" in migration and "v_canonical_asset_id := null" in migration)
check("migration:ambiguous-not-public", "Do not expose AMBIGUOUS" in migration)
check("migration:request-binding", "velmere.risk-history-public-request-binding.v1" in migration and "resolutionKind" in migration)
check("migration:page-envelope", all(f"'{field}'" in migration for field in ["requestedLimit", "before", "hasOlder", "nextBefore"]))
check("migration:service-role-only", "revoke all on function" in migration and "from public, anon, authenticated, service_role" in migration and "grant execute" in migration and "to service_role" in migration)
check("migration:no-customer-grant", "to anon" not in migration and "to authenticated" not in migration)
check("migration:partial-public-index", "where customer_publishable and publication_state = 'PUBLIC'" in migration)
check("migration:schema-source-parity", migration.strip() in schema)

check("active-pass:p94r1", active == "P94R1", active)

failed = [row for row in checks if row["status"] != "PASS"]
receipt = {
    "schemaVersion": "velmere.p94.risk-history-public-pagination-static.v1",
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
        for path in [
            "lib/market-integrity/risk-history-contract.ts",
            "lib/market-integrity/risk-ledger.ts",
            "lib/server/market-integrity-route-modules/history.ts",
            "lib/market-integrity/risk-history-customer-client.ts",
            "components/market-integrity/RiskHistoryControl.tsx",
            "supabase/migrations/20260821000001_p94_risk_history_public_only_pagination_temporal_window.sql",
            "lib/db/schema.sql",
        ]
    },
    "truthBoundary": "Static proof validates the P94 source contracts, public-only SQL selection before pagination, strict application parsing, cursor-bound page merging, truthful time-based chart geometry and customer-safe UI disclosures. It does not execute PostgreSQL, RLS, HTTP deployment, Browser rendering, accessibility journeys or Customer FINAL.",
}
for target in [
    ROOT / "receipts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_STATIC.json",
    ROOT / "artifacts/p94/P94_RISK_HISTORY_PUBLIC_PAGINATION_STATIC.json",
]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"]}, indent=2, ensure_ascii=False))
if failed:
    raise SystemExit(1)
