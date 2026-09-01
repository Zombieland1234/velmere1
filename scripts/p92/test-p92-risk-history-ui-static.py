#!/usr/bin/env python3
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
component = (ROOT / "components/market-integrity/RiskHistoryControl.tsx").read_text()
client = (ROOT / "lib/market-integrity/risk-history-customer-client.ts").read_text()
parent = (ROOT / "components/market-integrity/ShieldRealMarketsParityClient.tsx").read_text()
real_markets = (ROOT / "components/market-integrity/CrossAssetCollapseRadarPanel.tsx").read_text()
route = (ROOT / "lib/server/market-integrity-route-modules/history.ts").read_text()
checks = []

def check(name: str, condition: bool, detail=None):
    row = {"id": name, "status": "PASS" if condition else "FAIL"}
    if detail is not None:
        row["detail"] = detail
    checks.append(row)
    if not condition:
        raise AssertionError(f"{name}: {detail!r}")

# Customer client boundary.
check("client_schema_versioned", 'RISK_HISTORY_CUSTOMER_ROUTE_SCHEMA = "velmere.risk-history.customer-route.v1"' in client)
check("client_same_origin_deadline", "fetchSameOriginWithDeadline" in client)
check("client_bounded_json", "readJsonResponseBounded" in client and "RISK_HISTORY_CUSTOMER_MAX_RESPONSE_BYTES" in client)
check("client_no_store", 'cache: "no-store"' in client)
check("client_same_origin_credentials", 'credentials: "same-origin"' in client)
check("client_get_only", 'method: "GET"' in client)
check("client_json_accept", 'accept: "application/json"' in client)
check("client_closed_asset_id", "const ASSET_ID" in client and "URLSearchParams" in client)
check("client_max_events_144", "RISK_HISTORY_CUSTOMER_MAX_EVENTS = 144" in client)
check("client_live_false_required", 'input.publication.liveClaimed !== false' in client)
check("client_probability_false_required", 'value.isProbability !== false' in client and 'value.probabilityPercent !== null' in client)
check("client_exact_top_level", 'exactKeys(input, ["mode", "publication", "riskHistory", "generatedAt"])' in client)
check("client_exact_history_row", 'exactKeys(value, [' in client and '"eventReference"' in client and '"probabilityPercent"' in client)
check("client_duplicate_event_rejection", "seenEvents.has(row.eventReference)" in client)
check("client_order_rejection", "time < previousTime" in client)
check("client_storage_contract", "const storageContract" in client and "durable_history_not_configured" in client)
check("client_segment_binding", "segmentKeys.has(row.comparabilityKey)" in client)
check("client_public_score_version_digest", client.count("|| !digest(value.scoreVersion)") == 2)
check("client_generated_after_observation", "Date.parse(lastObservation) > Date.parse(input.generatedAt)" in client)
check("client_chart_clamped", "Math.max(48, Math.min(width, 2_000))" in client and "Math.min(100, Math.max(0, row.score))" in client)
check("client_no_external_endpoint", "http://" not in client and "https://" not in client)

# UI security/accessibility.
check("component_client_only", component.startswith('"use client";'))
check("component_body_portal", 'BodyPortal' in component)
check("component_focus_boundary", "useDialogFocusBoundary" in component)
check("component_dialog_role", 'role="dialog"' in component)
check("component_modal_semantics", 'aria-modal="true"' in component)
check("component_labelled_described", "aria-labelledby={titleId}" in component and "aria-describedby={descriptionId}" in component)
check("component_trigger_dialog_semantics", 'aria-haspopup="dialog"' in component and "aria-expanded={dialogOpen}" in component and "aria-controls={dialogOpen ? dialogId : undefined}" in component)
check("component_focus_return", "returnFocus: true" in component)
check("component_body_scroll_lock", 'document.body.style.overflow = "hidden"' in component)
check("component_escape_via_focus_boundary", "onClose: closeDialog" in component)
check("component_outside_close", "event.target === event.currentTarget" in component)
check("component_event_isolation", component.count("stopPropagation()") >= 4, component.count("stopPropagation()"))
check("component_compact_pointer_safe", 'pointer-events-none fixed' in component)
check("component_hover_and_focus", "onPointerEnter" in component and "onFocus" in component and "onBlur" in component)
check("component_touch_click_dialog", "setDialogOpen(true)" in component)
check("component_bounded_single_flight", "inFlightRef.current" in component and "controllerRef.current?.abort()" in component)
check("component_race_safe_single_flight_release", "if (controllerRef.current === controller)" in component and "controllerRef.current = null;\n        inFlightRef.current = false;" in component)
check("component_disable_cleanup", "if (available) return;" in component and "setDialogOpen(false);" in component)
check("component_null_score_safe", "formatScore(latest?.score ?? score, locale, 0)" in component)
check("component_error_no_auto_retry", 'loadState === "error"' in component and "void load(true)" in component)
check("component_no_unsafe_html", "dangerouslySetInnerHTML" not in component and ".innerHTML" not in component)
check("component_no_eval", "eval(" not in component and "new Function" not in component)
check("component_no_browser_storage", "localStorage" not in component and "sessionStorage" not in component and "document.cookie" not in component)
check("component_no_raw_reasons", "row.changeReasons" not in component)
check("component_no_raw_methodology", "row.methodologyVersion" not in component and "row.evidenceVersion" not in component)
check("component_no_server_limitations", "riskHistory.limitations" not in component)
check("component_no_provider_topology", all(token not in component for token in ["providerUrl", "providerUrls", "rawResponse", "sourceReceiptRoot", "evidenceDigest"]))
check("component_score_not_percent", "function formatScore" in component and "}/100`" in component and "`${score.toFixed(2)}%`" not in component)
check("component_current_withheld_history", "const available = enabled;" in component and "currentUnavailable" in component)
check("component_localized_pl", 'pl: {' in component and 'Historia ryzyka' in component)
check("component_localized_en", 'en: {' in component and 'Risk history' in component)
check("component_localized_de", 'de: {' in component and 'Risikoverlauf' in component)
check("component_localized_event_types", component.count("TRACKING_STARTED:") == 3 and component.count("HEARTBEAT:") == 3)
check("component_utc_explicit", 'timeZone: "UTC"' in component and " UTC" in component)
check("component_tracking_boundary", "startsAtTracking" in component)
check("component_probability_disclaimer", "notProbability" in component)
check("component_storage_boundary", "storageLabel" in component and "DURABLE_VERIFIED" in component)
check("component_segments_visible", "riskHistory.segments.length" in component)
check("component_segment_version_reference", "shortVersion(segment.scoreVersion)" in component and "comparableWithPreviousSegment" in component)
check("component_reduced_motion_loader", component.count("motion-reduce:animate-none") >= 2)
check("component_full_timeline", "fullTimeline" in component and "[...history].reverse()" in component)
check("component_chart_svg", "<svg" in component and "<polyline" in component and "preserveAspectRatio" in component)
check("component_no_fake_live", "LIVE" not in component and "liveClaimed" not in component)

# Parent integration and no nested controls on mobile.
check("parent_imports_control", 'import RiskHistoryControl from "@/components/market-integrity/RiskHistoryControl";' in parent)
check("parent_three_integrations", parent.count("<RiskHistoryControl") == 3, parent.count("<RiskHistoryControl"))
check("parent_desktop_integration", 'role="cell" className="shield-grid-cell-pass4577">\n                        <RiskHistoryControl' in parent)
check("parent_legacy_integration", '<td className="px-2 py-5 text-center">\n                        <RiskHistoryControl' in parent)
check("parent_mobile_separate_actions", 'data-risk-history-mobile-card="separate-primary-and-history-actions"' in parent)
mobile_start = parent.index('data-risk-history-mobile-card="separate-primary-and-history-actions"')
mobile_end = parent.index('</article>', mobile_start)
mobile = parent[mobile_start:mobile_end]
primary_close = mobile.index('</button>')
history_pos = mobile.index('<RiskHistoryControl')
check("mobile_history_after_primary_button", history_pos > primary_close, {"buttonClose": primary_close, "history": history_pos})
check("mobile_no_nested_history_button", "<RiskHistoryControl" not in mobile[:primary_close])
check("parent_reference_only_disables_history", parent.count('enabled={!referenceMode}') == 3)
check("parent_no_stale_single_action_claim", "single-hitbox-no-inner-chart-target" not in parent and "single-mobile-action" not in parent and "single-row-action" not in parent)
check("parent_risk_score_semantics", "function formatRiskScore" in parent and parent.count("formatRiskScore(") >= 5)
check("parent_no_risk_percent_in_cells", "formatRiskPercent(risk, safeLocale)" not in parent)
check("shield_modal_product_identity_explicit", 'productLabel="Velmère Shield"' in parent)
check("real_markets_modal_product_identity_explicit", 'productLabel="Velmère Real Markets"' in real_markets)

# Server boundary remains no-store and non-live.
check("route_no_store", '"cache-control": "no-store, max-age=0"' in route)
check("route_nosniff", '"x-content-type-options": "nosniff"' in route)
check("route_live_false", "liveClaimed: false" in route)
check("route_limit_500", "Math.min(Number(rawLimit ?? \"144\"), 500)" in route)
check("route_closed_query", 'const ALLOWED_QUERY_KEYS = new Set(["id", "limit"])' in route)
check("route_customer_projection_only", "buildCustomerRiskHistoryProjection" in route)

failed = [row for row in checks if row["status"] != "PASS"]
receipt = {
    "schemaVersion": "velmere.p92.risk-history-ui-static.v1",
    "status": "FAIL" if failed else "PASS_BOUNDED_STATIC_CUSTOMER_UI",
    "checks": {"total": len(checks), "passed": len(checks)-len(failed), "failed": len(failed), "rows": checks},
    "zeroFakeCredit": {
        "browserRendered": False,
        "accessibilityRuntimeExecuted": False,
        "realCustomerRouteExecuted": False,
        "customerFinal": "0/20",
        "riskIndicatorFinal": False,
        "live": False,
    },
    "truthBoundary": "Static proof of closed customer parsing, hover/focus/dialog wiring, no nested mobile controls, localization and anti-leakage source boundaries. It is not a rendered Browser/WCAG, staging or deployed customer journey proof.",
}
for target in [ROOT / "receipts/p92/P92_RISK_HISTORY_UI_STATIC.json", ROOT / "artifacts/p92/P92_RISK_HISTORY_UI_STATIC.json"]:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"status": receipt["status"], "checks": receipt["checks"]}, indent=2, ensure_ascii=False))
