#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "artifacts/closure/p33"
REPORT = OUT_DIR / "P33_REPORT_IN_PROGRESS.txt"
STATUS = OUT_DIR / "P33_STATUS.json"


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def sha(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except Exception:
        return None


def main() -> int:
    source = read_json(OUT_DIR / "source-identity.json")
    paid = read_json(OUT_DIR / "paid-readiness-matrix.json")
    tests = read_json(OUT_DIR / "paid-test-campaign-current.json")
    stripe = read_json(OUT_DIR / "local-stripe/R44P32_LOCAL_STRIPE_SUITE_RECEIPT.json")
    diff = read_json(OUT_DIR / "p32-vs-p33-current-diff.json")
    ts_screen = read_json(OUT_DIR / "final-static/changed-ts-transpile.json")
    mjs_screen = read_json(OUT_DIR / "final-static/changed-mjs-syntax.json")
    json_screen = read_json(OUT_DIR / "final-static/json-parse-screen.json")
    topology_screen = read_json(OUT_DIR / "final-static/customer-topology-screen.json")
    secret_screen = read_json(OUT_DIR / "final-static/credential-hygiene.json")
    states = paid.get("counts") if isinstance(paid.get("counts"), dict) else {}
    current_tests = tests.get("currentSourceSummary") if isinstance(tests.get("currentSourceSummary"), dict) else {}
    method = ROOT / "docs/authority/VELMERE_METODOLOGIA_FINISHOWANIA_CANONICAL_V11_PAID_READINESS_2026-08-13.txt"
    growth = ROOT / "docs/authority/VELMERE_GROWTH_INTEL_TOP_WORLD_R9_2026-08-13.txt"
    status = {
        "schemaVersion": "velmere.p33.status.v1",
        "revision": "P33_PAID_READINESS",
        "state": "IN_PROGRESS",
        "releaseState": "NO_GO",
        "live": False,
        "saleEnabled": False,
        "productionApproved": False,
        "worldClassProven": False,
        "sourceIdentity": {
            "fileCount": source.get("fileCount"),
            "payloadBytes": source.get("payloadBytes"),
            "pathSetSha256": source.get("pathSetSha256"),
            "sourceAggregateSha256": source.get("sourceAggregateSha256"),
            "receiptSha256": sha(OUT_DIR / "source-identity.json"),
        },
        "methodology": {"path": method.relative_to(ROOT).as_posix(), "sha256": sha(method), "version": "V11"},
        "growthIntel": {"path": growth.relative_to(ROOT).as_posix(), "sha256": sha(growth), "version": "R9"},
        "paidReadiness": {
            "axisCount": paid.get("axisCount"),
            "summary": states,
            "releasePassCount": paid.get("releasePassCount"),
            "goPaidAllowed": paid.get("goPaidAllowed"),
            "receiptSha256": sha(OUT_DIR / "paid-readiness-matrix.json"),
        },
        "paidCurrentSourceTests": {
            "denominator": tests.get("currentSourceDenominator"),
            "summary": current_tests,
            "historicalStaleParentDenominator": tests.get("historicalStaleParentDenominator"),
            "receiptSha256": sha(OUT_DIR / "paid-test-campaign-current.json"),
        },
        "localStripe": {
            "status": stripe.get("status"),
            "classification": stripe.get("classification"),
            "lifecycle": stripe.get("lifecycle"),
            "independentVerifier": stripe.get("independentVerifier"),
            "receiptSha256": sha(OUT_DIR / "local-stripe/R44P32_LOCAL_STRIPE_SUITE_RECEIPT.json"),
        },
        "finalStatic": {
            "changedTsTranspile": {"files": ts_screen.get("files"), "passed": ts_screen.get("passed"), "failed": ts_screen.get("failed"), "credit": ts_screen.get("credit")},
            "changedMjsSyntax": {"files": mjs_screen.get("files"), "passed": mjs_screen.get("passed"), "failed": mjs_screen.get("failed"), "credit": mjs_screen.get("credit")},
            "jsonParse": {"files": json_screen.get("files"), "passed": json_screen.get("passed"), "failed": json_screen.get("failed")},
            "credentialHygiene": {"status": secret_screen.get("status"), "passed": secret_screen.get("passed"), "failed": secret_screen.get("failed")},
            "customerTopology": {"numberedDataPassTotal": topology_screen.get("numberedDataPassTotal"), "rawResponseSpreadTotal": topology_screen.get("rawResponseSpreadTotal")},
        },
        "parentDiff": {
            "added": diff.get("added"),
            "changed": diff.get("changed"),
            "deleted": diff.get("deleted"),
        },
        "planningEstimate": {
            "goInternalPercentRange": [55, 65],
            "controlledPilotPercentRange": [34, 44],
            "goPaidPercentRange": [22, 32],
            "worldClassProvenPercentRange": [0, 5],
            "classification": "ESTIMATE_NOT_RELEASE_SCORE",
        },
        "truthBoundary": "P33 advances internal paid infrastructure and paid-readiness measurement. PASS_INTERNAL is not PASS_RELEASE. GO_PAID remains false until every applicable paid axis is PASS_RELEASE.",
    }
    STATUS.write_text(json.dumps(status, indent=2, ensure_ascii=False) + "\n", "utf-8")

    lines = [
        "VELMÈRE — P33 PAID READINESS / CURRENT SOURCE REPORT",
        "STATUS: IN_PROGRESS / NO_GO / LIVE=false / saleEnabled=false",
        "",
        "CURRENT-BYTE SOURCE",
        f"- files: {source.get('fileCount')}",
        f"- payload bytes: {source.get('payloadBytes')}",
        f"- path-set SHA-256: {source.get('pathSetSha256')}",
        f"- source aggregate SHA-256: {source.get('sourceAggregateSha256')}",
        "",
        "P33 MATERIAL CHANGES",
        "- Closed a Stripe-session entitlement bypass: payment evidence cannot mint Pro/Advanced against current disabled/not-for-sale SKU truth.",
        "- Replaced paid account delivery with pinned customer-safe schema v2 and removed operator/queue/payment/internal-PASS fields.",
        "- Rewrote customer Audit Account Messages UI; removed 462 numbered data-pass markers and preserved secure PDF delivery.",
        "- Added visible PL/EN/DE Angel AI disclosure and removed numbered customer topology from AngelPanel.",
        "- Added internal AI Act Article 50, MiCA/product-role and paid external-blocker memos without professional legal credit.",
        "- Added a 12-axis paid-readiness denominator and seven false-promotion mutation controls.",
        "- Executed current-bound local Stripe lifecycle: 12/12 lifecycle cases and 45/45 independent checks, LOCAL_FIXTURE_ONLY.",
        "",
        "PAID READINESS",
        f"- axis count: {paid.get('axisCount')}",
        f"- states: {json.dumps(states, sort_keys=True)}",
        f"- PASS_RELEASE: {paid.get('releasePassCount')}",
        f"- GO_PAID: {paid.get('goPaidAllowed')}",
        "- Provider commercial rights: 0 externally verified / 0 commercially enabled / 0 sell-eligible cells.",
        "- Merchant/legal profile: 26 blockers remain.",
        "- Final tier-value holdouts: 0/33.",
        "- Real customer WTP/refund evidence: 0.",
        "- Clean build/staging/operations: open.",
        "",
        "PAID CURRENT-SOURCE TEST CAMPAIGN",
        f"- current-source denominator: {tests.get('currentSourceDenominator')}",
        f"- current-source summary: {json.dumps(current_tests, sort_keys=True)}",
        f"- historical stale-parent tests retained separately: {tests.get('historicalStaleParentDenominator')}",
        "",
        "WHY THE PAID ESTIMATE CAN NOW RISE",
        "P32 mostly advanced fixture/profile execution. P33 physically advances payment, entitlement, refund/revoke, customer delivery, public-contract and AI-disclosure axes. This justifies an ESTIMATE increase, but not GO_PAID, because no axis is PASS_RELEASE and value/rights/legal/staging/customer evidence remain open.",
        "",
        "FINAL STATIC / DIAGNOSTIC SCREENS",
        f"- changed TS/TSX transpile: {ts_screen.get('passed')}/{ts_screen.get('files')} PASS; credit={ts_screen.get('credit')}",
        f"- changed MJS syntax: {mjs_screen.get('passed')}/{mjs_screen.get('files')} PASS; credit={mjs_screen.get('credit')}",
        f"- JSON parse: {json_screen.get('passed')}/{json_screen.get('files')} PASS",
        f"- credential hygiene: {secret_screen.get('status')} / {secret_screen.get('passed')} checks",
        f"- customer numbered data-pass in cleaned surfaces: {topology_screen.get('numberedDataPassTotal')}",
        "",
        "PLANNING ESTIMATES — NOT RELEASE SCORES",
        "- GO_INTERNAL: 55–65%",
        "- GO_CONTROLLED_PILOT: 34–44%",
        "- GO_PAID: 22–32%",
        "- GO_WORLD_CLASS_PROVEN: 0–5%",
        "",
        "NEXT HIGHEST-VALUE WORK",
        "1. Clean current-lock dependency install, project typecheck, production build and artifact identity.",
        "2. Final same-input Basic/Pro/Advanced holdouts and paid-tier value evidence.",
        "3. Disposable staging auth/tenant/privacy plus delivery/support/rollback/observability.",
        "4. Provider-rights decisions per field/use and professional paid-scope legal decisions.",
        "5. Narrow non-charging pilot, then real utility/WTP/refund evidence.",
        "",
        "GLOBAL DECISION: NO_GO",
    ]
    REPORT.write_text("\n".join(lines) + "\n", "utf-8")
    print(json.dumps({"status": "PASS_P33_REPORT_BUILT", "report": str(REPORT.relative_to(ROOT)), "statusFile": str(STATUS.relative_to(ROOT)), "statusSha256": sha(STATUS)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
