#!/usr/bin/env python3
from __future__ import annotations

import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path.cwd()
GENERATED_AT = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
DATE = "2026-08-23"
R4 = json.loads((ROOT / "artifacts/r4/VELMERE_R4_20_ROW_PROGRESS.json").read_text())
CAMPAIGN = json.loads((ROOT / "artifacts/r5/VELMERE_R5_CURRENT_EXECUTION_CAMPAIGN.json").read_text())
DEPENDENCIES = json.loads((ROOT / "artifacts/r5/VELMERE_R5_EXACT_DEPENDENCY_SOURCE_CLOSURE.json").read_text())
REPEATABILITY = json.loads((ROOT / "artifacts/r5/VELMERE_R5_CAMPAIGN_REPEATABILITY.json").read_text())
SHIM = json.loads((ROOT / "artifacts/r5/VELMERE_R5_TEST_ONLY_SHIM_BOUNDARY.json").read_text())
MARKET = json.loads((ROOT / "artifacts/r5/VELMERE_R5_CUSTOMER_OWNED_MARKET_EVIDENCE_BOUNDARY.json").read_text())

sha256 = lambda b: hashlib.sha256(b).hexdigest()
market_test = next(r for r in CAMPAIGN["results"] if r["file"].endswith("test-customer-owned-market-impact-attested-route.mts"))
market_receipt = {
    "schemaVersion": "velmere.r5.market-impact-customer-owned-evidence-execution-receipt.v1",
    "generatedAt": GENERATED_AT,
    "status": "PASS_BOUNDED" if market_test["classification"] == "PASS" and MARKET["status"] == "PASS_BOUNDED" else "FAIL",
    "test": market_test,
    "staticBoundary": {
        "status": MARKET["status"],
        "checkCount": len(MARKET["checks"]),
        "failureCount": len(MARKET["failures"]),
        "receipt": "artifacts/r5/VELMERE_R5_CUSTOMER_OWNED_MARKET_EVIDENCE_BOUNDARY.json",
    },
    "proved": [
        "real account/session required for attestation and analysis",
        "HMAC-SHA256 receipt is account-bound, asset-bound, snapshot-bound and short-lived",
        "customer snapshots are forced to verified_staging and cannot claim live",
        "public display and redistribution rights remain false",
        "cross-account replay, snapshot tampering, signature tampering, wrong asset and expiration are rejected",
        "provider network calls remain zero in the customer-owned path",
        "risk score and Customer FINAL remain withheld",
        "provider-owned paths retain their existing fail-closed preflights",
        "customer-declared source families do not become independently verified quorum",
    ],
    "notProved": [
        "authorized deployed staging",
        "durable receipt persistence/readback/restore",
        "independent legal rights review",
        "independent market-source quorum",
        "live/current market data",
        "impact-model calibration or real customer outcome quality",
        "exact Windows/final-byte engineering",
        "row-level Customer FINAL",
    ],
    "customerFinalCredit": False,
    "truthBoundary": MARKET["truthBoundary"],
}
(ROOT / "artifacts/r5/VELMERE_R5_MARKET_IMPACT_CUSTOMER_OWNED_EVIDENCE_RECEIPT.json").write_text(json.dumps(market_receipt, indent=2) + "\n")

rows = []
for original in R4["rows"]:
    row = copy.deepcopy(original)
    ordinal = row["ordinal"]
    closed = row.pop("r4ClosedLocalBoundaries")
    old_next = row.pop("r4NextInternalExecution")
    row.pop("r4DistanceMovement")
    row["r5DistanceMovement"] = "CLOSER_NO_FINAL_PROMOTION"
    row["r5ClosedLocalBoundaries"] = closed[:]
    row["r5NextInternalExecution"] = old_next
    if "R5_LOCAL_CURRENT_EXECUTION_CAMPAIGN" not in row["evidenceReceiptIds"]:
        row["evidenceReceiptIds"].append("R5_LOCAL_CURRENT_EXECUTION_CAMPAIGN")
    if ordinal == 17:
        row["r5ClosedLocalBoundaries"] += [
            "Added a separate customer-owned Market Impact attestation route requiring a real account/session and six exact rights assertions.",
            "The signed authority is account-, asset- and exact-snapshot-bound, short-lived and HMAC-SHA256 verified; cross-account replay, tampering, wrong asset and expiry are rejected.",
            "Customer-owned input is forced to verified_staging, makes zero provider network calls, cannot claim live/public redistribution or publish a risk score, and returns only a signature-free public projection.",
            "Provider-owned modes remain fail-closed; customer-declared provider families count as at most one independently verified source and cannot manufacture quorum.",
            "Fixed a real semantic bug where the substring 'age' inside 'storage' incorrectly forced STALE; explicit token boundaries now preserve the intended LIMITED truth state.",
            "Additional evidence blockers now survive the NO_USABLE_ORDER_BOOK/unavailable result path instead of being dropped.",
        ]
        row["remainingBlockers"] = [
            "OWNER_AUTHORIZED_DEPLOYED_STAGING_ROUTE",
            "REAL_AUTH_RLS_DURABLE_RECEIPT_READBACK_AND_RESTORE",
            "ATTRIBUTABLE_FIELD_USE_RIGHTS_REVIEW",
            "INDEPENDENT_SOURCE_IDENTITY_CURRENTNESS_AND_QUORUM_PROOF",
            "IMPACT_MODEL_CALIBRATION_ADVERSARIAL_BOOKS_AND_CUSTOMER_OUTCOMES",
            "EXACT_CURRENT_ENGINEERING_WINDOWS_AND_FINAL_BYTE_REPLAY",
        ]
        row["r5NextInternalExecution"] = (
            "Deploy the customer-owned evidence and Market Impact routes on an owner-authorized staging environment; execute a real account/JWT/RLS flow, persist the rights receipt and exact snapshot/report bytes, prove same-account readback plus cross-account denial and restore, then run current rights-reviewed thin/stale/manipulated-book cases and exact Windows final-byte replay."
        )
        row["evidenceReceiptIds"] += [
            "R5_CUSTOMER_OWNED_MARKET_EVIDENCE_BOUNDARY_21_OF_21",
            "R5_MARKET_IMPACT_CUSTOMER_OWNED_EVIDENCE_EXECUTION",
        ]
    rows.append(row)

campaign_summary = {
    "selectedTests": CAMPAIGN["selectedTests"],
    "summary": CAMPAIGN["summary"],
    "actualFailureCount": CAMPAIGN["actualFailureCount"],
    "classification": CAMPAIGN["classification"],
    "exactWindowsCredit": CAMPAIGN["exactWindowsCredit"],
    "stagingCredit": CAMPAIGN["stagingCredit"],
}

global_boundaries = [
    "The complete local current-execution campaign grew from 37/47 to 38/48 PASS because the new customer-owned Market Impact route executes end to end locally.",
    "All 48 classifications and exit codes repeated across two full runs; 44/48 stdout hashes and 48/48 stderr hashes matched.",
    "The new Market Impact boundary verifier passed 21/21 current-source checks.",
    "Provider modes remain fail-closed; the customer-owned path uses zero provider network calls and grants no live, risk-score, independent-rights or Customer FINAL credit.",
    "Exact dependency source closure remains 70/618, with seven tests still dependency-WITHHELD and no real local FAIL/TIMEOUT.",
    f"The test-only Next shim remains isolated from {SHIM['scannedProductionFiles']:,} scanned production files.",
]

payload = {
    "schemaVersion": "velmere.r5.20-row-progress-map.v1",
    "generatedAt": GENERATED_AT,
    "canonicalCheckpoint": "P101R1",
    "candidate": "AUDITED_CURRENT_SOURCE_CANDIDATE_R5",
    "parentCandidate": "AUDITED_CURRENT_SOURCE_CANDIDATE_R4",
    "ownerExecutionOrder": "INTERNAL_20_OF_20_THEN_CUSTOMER_CAMPAIGNS",
    "denominator": 20,
    "customerFinalNumerator": 0,
    "paidValueFinalNumerator": 0,
    "globalState": "NO_GO_STOP_SELL",
    "localCampaign": campaign_summary,
    "r5GlobalDistanceMovement": global_boundaries,
    "exactDependencySourceClosure": {
        "status": DEPENDENCIES["status"],
        "exactPackageLockMatch": DEPENDENCIES["binding"]["exactPackageLockMatch"],
        "exactPackageJsonMatch": DEPENDENCIES["binding"]["exactPackageJsonMatch"],
        **DEPENDENCIES["denominator"],
        "remainingDependencyTestCount": len(DEPENDENCIES["remainingDependencyTests"]),
        "remainingDependencyTests": DEPENDENCIES["remainingDependencyTests"],
    },
    "campaignRepeatability": {
        "status": REPEATABILITY["status"],
        "selectedTests": REPEATABILITY["selectedTests"],
        "perTest": REPEATABILITY["perTest"],
        "byteIdenticalCampaignClaim": REPEATABILITY["byteIdenticalCampaignClaim"],
    },
    "testOnlyShimBoundary": {
        "status": SHIM["status"],
        "scannedProductionFiles": SHIM["scannedProductionFiles"],
        "productionNextRuntimeCredit": SHIM["productionNextRuntimeCredit"],
    },
    "marketImpactCustomerOwnedEvidence": {
        "status": MARKET["status"],
        "checks": len(MARKET["checks"]),
        "failures": len(MARKET["failures"]),
        "executionReceipt": "artifacts/r5/VELMERE_R5_MARKET_IMPACT_CUSTOMER_OWNED_EVIDENCE_RECEIPT.json",
        "providerNetworkCredit": False,
        "liveMarketDataCredit": False,
        "customerFinalCredit": False,
    },
    "realMarketsCurrentTruth": R4["realMarketsCurrentTruth"],
    "authorityReconciliationNote": R4["authorityReconciliationNote"].replace("R4 preserves", "R5 preserves"),
    "rows": rows,
    "post20CustomerValidation": R4["post20CustomerValidation"],
    "truthBoundary": "R5 adds a real account/snapshot-bound customer-owned Market Impact evidence route, adversarial verification and repeatable local execution. It grants no authorized staging, durable receipt storage/restore, independent legal rights, provider quorum, calibrated impact, exact dependencies, exact Windows or row-level Customer FINAL credit.",
}
artifacts = ROOT / "artifacts/r5"
artifacts.mkdir(parents=True, exist_ok=True)
progress_path = artifacts / "VELMERE_R5_20_ROW_PROGRESS.json"
progress_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

summary = CAMPAIGN["summary"]
dep = DEPENDENCIES["denominator"]
report = f"""# VELMÈRE — R5 CONTINUATION EXECUTION REPORT

Classification: `AUDITED_CURRENT_SOURCE_CANDIDATE_R5 / NOT_A_CANONICAL_CHECKPOINT`

Canonical parent remains **P101R1**. R5 is a material current-source successor to R4. It does not claim authorized staging, attributable legal-rights approval, complete exact dependencies, exact Windows, Customer FINAL, GO_PAID or LIVE.

## Executive result

| Axis | R4 | R5 |
|---|---:|---:|
| Customer FINAL | 0/20 | **0/20** |
| Paid value FINAL | 0/10 | **0/10** |
| Local current-execution PASS | 37/47 | **38/48** |
| Dependency-environment WITHHELD | 7 | **7** |
| Actual local FAIL/TIMEOUT | 0 | **0** |
| Market Impact customer-owned input | absent | **PASS_BOUNDED end-to-end local route** |
| Market Impact source boundary | NO_USABLE_ORDER_BOOK only | **21/21 verifier + adversarial receipt tests** |
| Repeatability | 47/47 classification/exit | **48/48 classification/exit** |
| Exact dependency source closure | 70/618 | **70/618** |

## Material implementation

- Added a dedicated account-authenticated customer-owned market-evidence attestation endpoint.
- Added an HMAC-SHA256 authority receipt bound to account, canonical asset, exact normalized snapshot digest, issue time and expiry.
- Required explicit authority for private display, derived analytics, cache and retention; public display and redistribution stay denied.
- Forced customer snapshots to `verified_staging`, regardless of a submitted `verified_live` label.
- Added a separately authenticated `customer_owned_attested` Market Impact route that never fetches a provider.
- Preserved provider-owned delivery/publication preflights unchanged and fail-closed.
- Withheld derived risk, live claims and paid-depth publication for customer-attested books.
- Exposed only a signature-free public projection from the analysis route.
- Prevented customer-declared source families from manufacturing independent-source quorum.
- Fixed the `storage` → `age` substring bug that incorrectly marked valid customer evidence as stale.
- Preserved additional rights/currentness blockers even when the order book becomes unavailable.

## Adversarial proof

The new end-to-end test passes all of the following on current source:

- unauthenticated attestation denied;
- incomplete attestation denied;
- valid real-session flow accepted;
- account, asset, snapshot and signature binding;
- cross-account replay denied;
- snapshot tampering denied;
- signature tampering denied;
- expired receipt denied;
- wrong asset denied;
- forced staging status;
- public/redistribution denied;
- risk score withheld;
- zero provider network calls;
- no receipt signature, account hash or secret in the analysis response;
- no Customer FINAL promotion.

The dedicated source verifier passed **{len(MARKET['checks'])}/{len(MARKET['checks'])}** checks. This remains bounded local evidence, not staging or legal approval.

## Current campaign

```json
{json.dumps({'selectedTests': CAMPAIGN['selectedTests'], 'summary': summary, 'actualFailureCount': CAMPAIGN['actualFailureCount'], 'classification': CAMPAIGN['classification']}, indent=2)}
```

Two full runs produced **48/48 identical classifications**, **48/48 identical exit codes**, **44/48 identical stdout hashes** and **48/48 identical stderr hashes**. Run-specific timestamps/nonces remain explicitly non-byte-identical.

## Remaining dependency truth

- Exact required tarballs present: **{dep['exactRequiredTarballsPresent']}/{dep['requiredUniqueTarballs']}**.
- Missing: **{dep['exactRequiredTarballsMissing']}**.
- Seven tests remain dependency-WITHHELD: two React/TSX boundaries and five real PGlite/PostgreSQL-WASM migrations.
- No older or differently sized PGlite bundle was substituted for pinned `@electric-sql/pglite@0.5.4`.

## Why Market Impact is not FINAL yet

The route still needs an owner-authorized deployed environment, real auth/JWT/RLS and tenant isolation, durable receipt/snapshot/report storage plus readback/restore, attributable field/use rights review, independently verified source identity/currentness/quorum, calibrated/adversarial impact behavior, full exact engineering and Windows final-byte replay.

## Honest status

- `CUSTOMER_FINAL = 0/20`
- `PAID_VALUE_FINAL = 0/10`
- `GLOBAL = NO_GO / STOP_SELL`
- `LOCAL_CAMPAIGN_PASS = 38/48`
- `LOCAL_CAMPAIGN_ACTUAL_FAILURES = 0`
- `DEPENDENCY_WITHHELD = 7`
- `EXACT_REQUIRED_TARBALLS_PRESENT = 70/618`
- `MARKET_IMPACT_CUSTOMER_OWNED_BOUNDARY = PASS_BOUNDED`
- `AUTHORIZED_STAGING = WITHHELD`
- `EXACT_WINDOWS = WITHHELD`
- `NEXT_HIGHEST_VALUE = AUTHORIZED STAGING + DURABLE AUTH/RLS/READBACK/RESTORE, WHILE COMPLETING EXACT DEPENDENCIES`
"""
(ROOT / f"VELMERE_R5_CONTINUATION_EXECUTION_REPORT_{DATE}.md").write_text(report)

roadmap = f"""# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA, R5

## Stan nadrzędny

- Canonical checkpoint: **P101R1**.
- Bieżący plik do dalszej pracy: **R5 audited current-source candidate**.
- Customer FINAL: **0/20**.
- Paid value FINAL: **0/10**.
- Globalnie: **NO_GO / STOP_SELL**.

## Co R5 fizycznie przesunął

1. Kampania wzrosła do **38 PASS / 48**, przy **0 rzeczywistych FAIL/TIMEOUT**.
2. Nowa ścieżka Market Impact obsługuje customer-owned snapshoty bez providerowego API i bez obchodzenia provider rights gate.
3. Receipt jest account/asset/snapshot/time-bound, podpisany HMAC-SHA256 i odporny na cross-account replay oraz podmianę bajtów.
4. Dane customer-owned są zawsze `verified_staging`; nie mogą udawać `live`, niezależnego quorum ani publikowalnego risk score.
5. Providerowe ścieżki nadal fail-closed.
6. Verifier granicy przeszedł **21/21**, a dwie kompletne kampanie utrzymały **48/48** identycznych klasyfikacji i kodów wyjścia.
7. Naprawiono realny błąd semantyczny `storage` → `age` oraz utratę blockerów w unavailable path.

## Najkrótsza uczciwa droga dalej

### Faza A — pierwszy pełny row candidate

1. Wdrożyć customer-owned evidence + Market Impact na owner-authorized staging.
2. Użyć realnego konta/JWT, dwóch tenantów i RLS; potwierdzić cross-account denial.
3. Trwale zapisać receipt, normalized snapshots i exact report bytes.
4. Wykonać same-account readback, backup/restore i post-restore ownership/RLS.
5. Podpiąć przypisywalną field/use rights decision oraz exact currentness/source identity.
6. Uruchomić thin/stale/manipulated/conflicted books i kalibrację bez fałszywej precyzji.
7. Exact engineering + Windows final-byte replay.

### Faza B — wspólne odblokowanie pozostałych rowów

8. Exact React 19.2.7, ReactDOM 19.2.7, TypeScript 5.9.3 i PGlite 0.5.4 albo świeży exact-lock `npm ci` receipt.
9. Pełne TypeScript, ESLint zero-warning, Webpack, Turbopack, smoke, browser, PDF i PL/EN/DE.
10. Lokalny/Supabase staging: migracje, service role, dwa JWT, RLS, rollback/concurrency, export/delete, DB+Storage restore.

### Faza C — najbliższe kolejne FINAL candidates

11. Browser Basic: authorized input → safe fetch → durable store → account readback.
12. Risk Indicator: migrations/RLS/history/restore/deployed HTTP.
13. Audit Basic: real input → evidence → findings → remediation/retest → immutable PDF same-blob.
14. Potem Browser/Audit/Shield/Shield Pro tiery i 10/10 matched paid transitions.
15. Audit Pro/Advanced quorum, Real Markets mandatory observations i Angel real model.
16. Exact 20-row final-byte replay; dopiero wtedy `Customer FINAL = 20/20`.

## Po 20/20

100 personas × 24 kroki, 50 Audit cases × 3 tiery × ≥6 reviewerów, pełny Angel real-model campaign, accessibility/performance/stability, polish, external pilot i human AppSec/legal pozostają osobną późniejszą fazą.

## Zasada

Customer-owned data nie omija praw. R5 pozwala użyć danych, do których właściciel/klient deklaruje dokładne uprawnienia, lecz nadal wymusza private/staging/fail-closed stan i nie przyznaje zielonej odznaki bez trwałego stagingowego dowodu.
"""
(ROOT / f"VELMERE_MAPA_DROGI_DO_TOPKI_SWIATA_R5_{DATE}.md").write_text(roadmap)

status = f"""VELMÈRE CURRENT CANDIDATE STATUS — R5
Date: {DATE}
Canonical parent: P101R1
Candidate: AUDITED_CURRENT_SOURCE_CANDIDATE_R5

CUSTOMER_FINAL=0/20
PAID_VALUE_FINAL=0/10
GLOBAL=NO_GO_STOP_SELL
LOCAL_CAMPAIGN_PASS=38/48
LOCAL_CAMPAIGN_ACTUAL_FAILURES=0
DEPENDENCY_WITHHELD=7
AUTHORIZED_RUNTIME_WITHHELD=1
EXACT_WINDOWS_WITHHELD=1
EXTERNAL_RECEIPT_ARGUMENT_NOT_RUN=1
EXACT_REQUIRED_TARBALLS_PRESENT=70/618
EXACT_REQUIRED_TARBALLS_MISSING=548
MARKET_IMPACT_CUSTOMER_OWNED_BOUNDARY=PASS_BOUNDED_21_OF_21
CAMPAIGN_REPEATABILITY=48_OF_48_CLASSIFICATION_AND_EXIT

R5 MATERIAL MOVEMENT:
- real account-bound customer-owned market evidence attestation route;
- HMAC-SHA256 account/asset/snapshot/expiry authority;
- zero provider network path without provider-gate bypass;
- forced staging, no live/risk/public redistribution/FINAL claim;
- tamper, cross-account, wrong-asset and expiry denial;
- provider fail-closed behavior retained;
- source-family anti-inflation and semantic stale bug fixed.

NO CREDIT CLAIMED FOR:
- authorized deployed staging;
- durable receipt/readback/restore;
- independent legal rights or market-source quorum;
- calibrated impact/customer outcomes;
- complete exact dependencies;
- exact Windows Server 2025;
- Customer FINAL, GO_PAID or LIVE.
"""
(ROOT / f"VELMERE_R5_CURRENT_CANDIDATE_STATUS_{DATE}.txt").write_text(status)

lines = [
    "# VELMÈRE — TABELA DROGI `0/20 → 20/20` — R5",
    "",
    "Canonical parent: **P101R1**  ",
    "Candidate: **AUDITED_CURRENT_SOURCE_CANDIDATE_R5**  ",
    "Customer FINAL: **0/20**  ",
    "Paid value FINAL: **0/10**  ",
    "Global: **NO_GO / STOP_SELL**",
    "",
    "> R5 wykonuje realną, account-bound ścieżkę Market Impact, ale nie podbija licznika bez stagingu, trwałości, praw, kalibracji i exact final-byte proof.",
    "",
    "## Zmiana R4 → R5",
    "",
    "| Oś | R4 | R5 | Uczciwy wynik |",
    "|---|---:|---:|---|",
    "| Local current-execution | 37 PASS / 47 | **38 PASS / 48** | +1 nowy end-to-end PASS; 0 real FAIL/TIMEOUT. |",
    "| Market Impact customer-owned evidence | brak | **PASS_BOUNDED** | Account/asset/snapshot/time-bound, zero provider network, bez live/risk/FINAL. |",
    "| Boundary verifier | brak | **21/21 PASS** | Provider paths nadal fail-closed; public projection bez podpisu. |",
    "| Repeatability | 47/47 classification + exit | **48/48 classification + exit** | 44/48 stdout i 48/48 stderr hash stable. |",
    "| Dependency WITHHELD | 7 | **7** | 2 React/TSX + 5 PGlite, bez atrap. |",
    "| Customer FINAL | 0/20 | **0/20** | Zero fałszywego kredytu. |",
    "",
    "## Pełne 20 wierszy",
    "",
    "| # | Wiersz | Stan | Zamknięte lokalnie do R5 | Co nadal blokuje FINAL | Następna realna egzekucja |",
    "|---:|---|---|---|---|---|",
]
for row in rows:
    closed = "<br>".join(f"✅ {item}" for item in row["r5ClosedLocalBoundaries"])
    blockers = "<br>".join(f"• `{item}`" for item in row["remainingBlockers"])
    next_action = row["r5NextInternalExecution"].replace("|", "\\|")
    lines.append(f"| {row['ordinal']} | **{row['displayName']}**<br>`{row['productId']}` | 🟡 WITHHELD<br>0 FINAL | {closed} | {blockers} | {next_action} |")
lines += [
    "",
    "## Dokładne blokady środowiska",
    "",
    "| Liczba | Bloker |",
    "|---:|---|",
    "| 2 testy | Exact React 19.2.7 / ReactDOM 19.2.7 / TypeScript 5.9.3 dla prawdziwych TSX/page boundaries. |",
    "| 5 testów | Exact `@electric-sql/pglite@0.5.4` i prawdziwe migracje PostgreSQL/WASM. |",
    "| 1 test | Owner-authorized Supabase/runtime environment. |",
    "| 1 test | Exact Windows Server 2025 / Node 24.18.0 / npm 11.16.0. |",
    "| 1 test | Zewnętrzny canonical runtime receipt argument. |",
    "",
    "## Po 20/20",
    "",
    "Dopiero po 20 owner-authorized end-to-end wykonaniach przechodzimy do 100 personas × 24 kroki, 50 Audit cases × 3 tiery × ≥6 reviewerów, pełnego Angel real-model campaign, accessibility/performance/stability, polish, external pilot i human AppSec/legal.",
]
(ROOT / f"VELMERE_20_OF_20_PROGRESS_TABLE_R5_{DATE}.md").write_text("\n".join(lines) + "\n")

recipe = {
    "schemaVersion": "velmere.p101r1.r5.package-build-recipe.v1",
    "checkpoint": "P101R1",
    "candidate": "R5",
    "parentCandidate": "R4",
    "inputMode": "CURRENT_AUDITED_SOURCE_TREE_EXCLUDING_SELF_REFERENTIAL_MANIFEST_FILES_AND_RUNTIME",
    "ordering": "lexicographic-relative-path",
    "timestamp": "1980-01-01T00:00:00Z",
    "directoryEntries": 0,
    "zipCreateSystem": 0,
    "externalMode": "0600",
    "compression": "ZIP_DEFLATED",
    "compressionLevel": 1,
    "deterministicRebuildsRequired": 2,
    "runtimeExclusions": [".velmere/", "node_modules/", ".git/"],
    "truthBoundary": "Packaging and byte identity only; no staging, rights, dependency-tree, Windows or Customer FINAL credit.",
}
(ROOT / "P101R1_R5_PACKAGE_BUILD_RECIPE.json").write_text(json.dumps(recipe, indent=2) + "\n")

print(json.dumps({
    "progress": progress_path.relative_to(ROOT).as_posix(),
    "report": f"VELMERE_R5_CONTINUATION_EXECUTION_REPORT_{DATE}.md",
    "table": f"VELMERE_20_OF_20_PROGRESS_TABLE_R5_{DATE}.md",
    "roadmap": f"VELMERE_MAPA_DROGI_DO_TOPKI_SWIATA_R5_{DATE}.md",
    "marketReceipt": "artifacts/r5/VELMERE_R5_MARKET_IMPACT_CUSTOMER_OWNED_EVIDENCE_RECEIPT.json",
}, indent=2))
