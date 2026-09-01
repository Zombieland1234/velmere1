#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
from pathlib import Path

ROOT = Path.cwd()
GENERATED_AT = "2026-08-22T21:45:00.000Z"
R3 = json.loads((ROOT / "artifacts/r3/VELMERE_R3_20_ROW_PROGRESS.json").read_text())
CAMPAIGN = json.loads((ROOT / "artifacts/r4/VELMERE_R4_CURRENT_EXECUTION_CAMPAIGN.json").read_text())
DEPENDENCIES = json.loads((ROOT / "artifacts/r4/VELMERE_R4_EXACT_DEPENDENCY_SOURCE_CLOSURE.json").read_text())
REPEATABILITY = json.loads((ROOT / "artifacts/r4/VELMERE_R4_CAMPAIGN_REPEATABILITY.json").read_text())
SHIM = json.loads((ROOT / "artifacts/r4/VELMERE_R4_TEST_ONLY_SHIM_BOUNDARY.json").read_text())

campaign_summary = {
    "selectedTests": CAMPAIGN["selectedTests"],
    "summary": CAMPAIGN["summary"],
    "actualFailureCount": CAMPAIGN["actualFailureCount"],
    "classification": CAMPAIGN["classification"],
    "exactWindowsCredit": CAMPAIGN["exactWindowsCredit"],
    "stagingCredit": CAMPAIGN["stagingCredit"],
}

global_boundaries = [
    "The exact source-embedded zod@3.25.76 archive was SHA-256/size verified and extracted only under the gitignored .velmere local-test root.",
    "Six formerly dependency-withheld zod current-execution tests now pass.",
    "The test-only next/server compatibility surface now exposes after(); two auth/session boundary tests now pass without granting production Next runtime credit.",
    "The complete 47-test campaign moved from 29 PASS / 15 dependency WITHHELD to 37 PASS / 7 dependency WITHHELD, with 0 actual FAIL.",
    "Two full campaign runs preserved all 47 classifications and exit codes; 42/47 stdout hashes and 47/47 stderr hashes matched.",
    "A production-reference sweep scanned 1,954 source files and found no reference to the test-only Next shim.",
    "The current package-lock exactly matches the historical P42 lock binding, but current source embeds only 70 of 618 required exact tarballs; 548 remain absent.",
]

additions = {
    7: [
        "Dedicated Shield Basic rights firewall now executes and passes from the exact zod archive; blocked/unknown rights deny network and customer delivery.",
    ],
    10: [
        "Cross-product investigator rights firewall executes and passes with withheld rights, zero network delivery and deterministic customer-safe projection.",
    ],
    11: [
        "Cross-product investigator rights firewall executes and passes; no Pro workflow or entitlement credit is inferred.",
    ],
    12: [
        "Cross-product investigator rights firewall executes and passes; no Advanced adjudication/export credit is inferred.",
    ],
    13: [
        "Real Markets risk/table contract binding now executes: 62 assertions across 23 field contracts and 19 risk-input contracts.",
        "The 250-row market snapshot roundtrip passes with 4,904,441 serialized bytes and no invented runtime observation credit.",
    ],
    14: [
        "Real Markets risk/table contract binding now executes: 62 assertions across 23 field contracts and 19 risk-input contracts.",
        "The 250-row market snapshot roundtrip passes; no missing Pro provider observation is converted into value.",
    ],
    15: [
        "Real Markets risk/table contract binding now executes: 62 assertions across 23 field contracts and 19 risk-input contracts.",
        "The 250-row market snapshot roundtrip passes; no missing Advanced provider observation is converted into value.",
    ],
    17: [
        "Dedicated Market Impact runtime now passes the canonical NO_USABLE_ORDER_BOOK boundary instead of remaining dependency-WITHHELD.",
        "The local result returns a null book/no synthetic liquidity and grants no impact/calibration/live-data credit.",
    ],
    19: [
        "Provider cost-amplification guard now executes and passes 16 assertions with 0 physical network calls and a maximum of 4 candidates.",
        "Cross-product Angel rights firewall executes and passes while rights remain withheld; no model-quality credit is inferred.",
    ],
    20: [
        "Cross-product Risk Indicator rights firewall now executes and passes while rights are withheld.",
        "Refresh-session family revocation and signup email-confirmation boundaries now execute and pass through the test-only after() compatibility surface.",
    ],
}

blocker_replacements = {
    17: [
        "OWNER_AUTHORIZED_CURRENT_INPUT_AND_FIELD_RIGHTS_STATE",
        "DEPLOYED_ROUTE_RETURNING_RIGHTS_SAFE_BOOK_OR_CANONICAL_NO_USABLE_ORDER_BOOK",
        "MODEL_DOMAIN_CALIBRATION_UNCERTAINTY_AND_ADVERSARIAL_BOOKS",
    ],
}

next_replacements = {
    17: "Run one owner-authorized current input on staging and prove the deployed route returns either a rights-safe real/AMM book with exact semantics or the already-tested canonical NO_USABLE_ORDER_BOOK state.",
    20: "Use authorized local/Supabase staging to execute migrations, service role, two JWTs, RLS/cross-account denial, rollback/concurrency, DB+Storage restore, deployed HTTP/history/readback and the now-unblocked session lifecycle.",
}

receipt_additions = {
    7: ["R4_SHIELD_BASIC_RIGHTS_FIREWALL"],
    10: ["R4_CROSS_PRODUCT_CUSTOMER_RIGHTS_FIREWALL"],
    11: ["R4_CROSS_PRODUCT_CUSTOMER_RIGHTS_FIREWALL"],
    12: ["R4_CROSS_PRODUCT_CUSTOMER_RIGHTS_FIREWALL"],
    13: ["R4_MARKET_SNAPSHOT_250_ROUNDTRIP", "R4_REAL_MARKETS_RISK_CONTRACT_BINDING"],
    14: ["R4_MARKET_SNAPSHOT_250_ROUNDTRIP", "R4_REAL_MARKETS_RISK_CONTRACT_BINDING"],
    15: ["R4_MARKET_SNAPSHOT_250_ROUNDTRIP", "R4_REAL_MARKETS_RISK_CONTRACT_BINDING"],
    17: ["R4_MARKET_IMPACT_NO_USABLE_ORDER_BOOK"],
    19: ["R4_PROVIDER_COST_AMPLIFICATION_GUARD", "R4_CROSS_PRODUCT_CUSTOMER_RIGHTS_FIREWALL"],
    20: ["R4_CROSS_PRODUCT_CUSTOMER_RIGHTS_FIREWALL", "R4_REFRESH_SESSION_FAMILY_REVOCATION", "R4_SIGNUP_EMAIL_CONFIRMATION_FLOW"],
}

rows = []
for original in R3["rows"]:
    row = copy.deepcopy(original)
    ordinal = row["ordinal"]
    old_closed = row.pop("r3ClosedLocalBoundaries")
    old_next = row.pop("r3NextInternalExecution")
    row.pop("r3DistanceMovement")
    row["r4DistanceMovement"] = "CLOSER_NO_FINAL_PROMOTION"
    row["r4ClosedLocalBoundaries"] = old_closed + additions.get(ordinal, [])
    if ordinal == 17:
        row["r4ClosedLocalBoundaries"] = [
            line for line in row["r4ClosedLocalBoundaries"]
            if "remains WITHHELD" not in line
        ]
    row["remainingBlockers"] = blocker_replacements.get(ordinal, row["remainingBlockers"])
    row["r4NextInternalExecution"] = next_replacements.get(ordinal, old_next)
    row["evidenceReceiptIds"] = [
        receipt.replace("R3_LOCAL_CURRENT_EXECUTION_CAMPAIGN", "R4_LOCAL_CURRENT_EXECUTION_CAMPAIGN")
        for receipt in row["evidenceReceiptIds"]
    ] + receipt_additions.get(ordinal, [])
    rows.append(row)

payload = {
    "schemaVersion": "velmere.r4.20-row-progress-map.v1",
    "generatedAt": GENERATED_AT,
    "canonicalCheckpoint": "P101R1",
    "candidate": "AUDITED_CURRENT_SOURCE_CANDIDATE_R4",
    "parentCandidate": "AUDITED_CURRENT_SOURCE_CANDIDATE_R3",
    "ownerExecutionOrder": "INTERNAL_20_OF_20_THEN_CUSTOMER_CAMPAIGNS",
    "denominator": 20,
    "customerFinalNumerator": 0,
    "paidValueFinalNumerator": 0,
    "globalState": "NO_GO_STOP_SELL",
    "localCampaign": campaign_summary,
    "r4GlobalDistanceMovement": global_boundaries,
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
    "realMarketsCurrentTruth": R3["realMarketsCurrentTruth"],
    "authorityReconciliationNote": R3["authorityReconciliationNote"].replace("R3 preserves", "R4 preserves"),
    "rows": rows,
    "post20CustomerValidation": R3["post20CustomerValidation"],
    "truthBoundary": "R4 adds exact source-archive dependency evidence, eight newly executing local tests, repeatability and a test-only shim boundary. It grants no dependency-tree/npm-ci, production Next/React/PGlite, authorized staging, rights approval, exact Windows or row-level Customer FINAL credit.",
}

artifacts_dir = ROOT / "artifacts/r4"
artifacts_dir.mkdir(parents=True, exist_ok=True)
progress_json = artifacts_dir / "VELMERE_R4_20_ROW_PROGRESS.json"
progress_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")

summary = CAMPAIGN["summary"]
dep = DEPENDENCIES["denominator"]

report = f"""# VELMÈRE — R4 CONTINUATION EXECUTION REPORT

Classification: `AUDITED_CURRENT_SOURCE_CANDIDATE_R4 / NOT_A_CANONICAL_CHECKPOINT`

Canonical parent remains **P101R1**. R4 is a material dependency/test-execution successor to R3. It does not claim authorized staging, field-level rights approval, exact Windows, complete npm installation, Customer FINAL, GO_PAID or LIVE.

## Executive result

| Axis | R3 | R4 |
|---|---:|---:|
| Customer FINAL | 0/20 | **0/20** |
| Paid value FINAL | 0/10 | **0/10** |
| Local current-execution PASS | 29/47 | **37/47** |
| Dependency-environment WITHHELD | 15 | **7** |
| Actual local FAIL/TIMEOUT | 0 | **0** |
| Market Impact dedicated runtime | dependency WITHHELD | **PASS canonical NO_USABLE_ORDER_BOOK** |
| Shield Basic dedicated rights firewall | dependency WITHHELD | **PASS** |
| Exact dependency source closure | not quantified in R3 | **70/618 exact tarballs present; 548 missing** |
| Repeatability | six selected commands | **47/47 classification + exit stable across two full runs** |
| Test-shim production isolation | not separately proven | **1,954 production files scanned; 0 references** |

## Material source work

- Added a reproducible R4 preparer that verifies the exact embedded `zod@3.25.76` archive by SHA-256 and byte length before extracting it only under the gitignored `.velmere/offline-test-deps` tree.
- Added `after()` to the existing test-only `next/server` compatibility surface so isolated auth/session route tests can execute without pretending the real Next runtime is installed.
- Added a production-reference verifier; 1,954 production source files contain no reference to the test-only shim.
- Added a whole-source dependency closure audit against the historical P42 exact CAS manifest.
- Added a new 47-test R4 campaign runner with explicit exact-archive and test-shim evidence boundaries.
- Added a two-run repeatability comparator that distinguishes stable outcomes from byte-identical output.

## Exact dependency truth

- Current `package-lock.json` SHA-256: `{DEPENDENCIES['binding']['currentPackageLockSha256']}`.
- Historical P42 lock SHA-256: `{DEPENDENCIES['binding']['p42PackageLockSha256']}`.
- Lock match: **PASS exact**.
- Current `package.json` does **not** match the older P42 package manifest; no complete P42 source/package identity is claimed.
- Required unique tarballs: **{dep['requiredUniqueTarballs']}**.
- Exact required tarballs physically present in current source: **{dep['exactRequiredTarballsPresent']}**.
- Exact required tarballs missing: **{dep['exactRequiredTarballsMissing']}**.
- Exact source coverage: **{dep['exactRequiredCoverageBps'] / 100:.2f}%**.

The exact embedded `zod` archive is present and now used for bounded local execution. Exact archives for `typescript@5.9.3`, `react@19.2.7`, `react-dom@19.2.7`, `@electric-sql/pglite@0.5.4` and `next@16.2.12` are not present in current source. The Next test shim does not replace the missing production package.

## Current local campaign

```json
{json.dumps({'selectedTests': CAMPAIGN['selectedTests'], 'summary': summary, 'actualFailureCount': CAMPAIGN['actualFailureCount'], 'classification': CAMPAIGN['classification']}, indent=2)}
```

### Eight newly executing PASS tests

1. `test-cross-product-customer-rights-firewall.mts`
2. `test-market-impact-no-usable-order-book.mts`
3. `test-market-snapshot-250-roundtrip.mts`
4. `test-real-markets-risk-contract-binding.mts`
5. `test-shield-basic-rights-firewall.mts`
6. `test-vlm-provider-cost-amplification-guard.mts`
7. `test-refresh-session-family-revocation-boundary.mts`
8. `test-signup-email-confirmation-flow-boundary.mts`

These tests add real local evidence but no row-level FINAL. In particular, the `after()` compatibility surface is test-only, and the zod extraction is one package rather than a complete installation.

### Seven remaining dependency WITHHELD tests

- Two React/TSX page/Verify boundaries are blocked first by missing exact `react`; full execution also requires the exact ReactDOM/TypeScript stack.
- Five PGlite migration/runtime tests are blocked by missing exact `@electric-sql/pglite`.

The whole-project build remains blocked more broadly because 548 exact lock-bound tarballs are absent from current source and the current environment is Node {CAMPAIGN['environment']['node']} / npm {CAMPAIGN['environment']['npm']}, not the canonical Node 24.18.0 / npm 11.16.0 / Windows Server 2025 target.

## Repeatability

Two complete 47-test campaigns produced:

- **47/47 identical classifications**;
- **47/47 identical exit codes**;
- **47/47 identical stderr hashes**;
- **42/47 identical stdout hashes**.

Five stdout payloads include run-specific nonce/time/evidence values. R4 therefore claims repeatable outcomes, not byte-identical campaign output.

## Product distance movement

- **Market Impact:** its dedicated fail-closed `NO_USABLE_ORDER_BOOK` runtime is now locally green. Remaining work is the owner-authorized deployed route with real rights/currentness state.
- **Shield Basic:** the dedicated rights firewall is now executable and green.
- **Real Markets B/P/A:** risk/field contract binding and the 250-row roundtrip now execute; actual mandatory field observations and rights remain open.
- **Shield Pro B/P/A, Angel, Risk Indicator:** the cross-product rights firewall now executes; paid workflow/model/staging credit remains open.
- **Account auth/session:** refresh-family revocation and email-confirmation boundaries now execute; real Supabase/JWT/RLS/staging remains open.

## What physically blocks the next promotion

1. Recover or lawfully reacquire the exact current dependency closure; immediate local-test targets are React/ReactDOM/TypeScript and PGlite, while full engineering requires the complete 618-tarball lock-bound set or a fresh exact `npm ci` proof.
2. Run whole-project TypeScript, ESLint zero-warning, Webpack, Turbopack, browser/PDF and PL/EN/DE on the exact candidate.
3. Execute owner-authorized local/Supabase staging with two accounts/JWTs, RLS, write/readback, rollback/concurrency, export/delete and DB+Storage restore.
4. Obtain attributable field/provider/use rights decisions.
5. Close Audit Pro/Advanced rights-safe quorum, Real Markets mandatory observations/paid value and Angel real-model compute/quality.
6. Run exact Windows Server 2025 final-byte replay.

## Honest status

- `CUSTOMER_FINAL = 0/20`
- `PAID_VALUE_FINAL = 0/10`
- `GLOBAL = NO_GO / STOP_SELL`
- `LOCAL_CAMPAIGN_PASS = 37/47`
- `LOCAL_CAMPAIGN_ACTUAL_FAILURES = 0`
- `DEPENDENCY_WITHHELD = 7`
- `EXACT_REQUIRED_TARBALLS_PRESENT = 70/618`
- `EXACT_WINDOWS = WITHHELD`
- `AUTHORIZED_STAGING = WITHHELD`
- `NEXT_HIGHEST_VALUE = EXACT_DEPENDENCY COMPLETION + AUTHORIZED STAGING, THEN ROW-BY-ROW PHYSICAL CLOSURE`
"""
(ROOT / "VELMERE_R4_CONTINUATION_EXECUTION_REPORT_2026-08-22.md").write_text(report)

roadmap = f"""# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA, R4

## Stan nadrzędny

- Canonical checkpoint: **P101R1**.
- Bieżący plik do dalszej pracy: **R4 audited current-source candidate**.
- Customer FINAL: **0/20**.
- Paid value FINAL: **0/10**.
- Globalnie: **NO_GO / STOP_SELL**.

## Co R4 fizycznie przesunął

1. Pełna kampania lokalna wzrosła z **29 do 37 PASS** przy **0 rzeczywistych FAIL**.
2. Dependency WITHHELD spadło z **15 do 7**.
3. Dokładny `zod@3.25.76` został odtworzony z już istniejącego, SHA-256-związanego archiwum źródłowego.
4. Dwa testy auth/session wykonują się przez test-only `after()` boundary; 1,954 pliki produkcyjne nie odwołują się do shimu.
5. Market Impact ma zielony lokalny kontrakt `NO_USABLE_ORDER_BOOK` bez syntetycznej płynności.
6. Shield Basic rights firewall, Real Markets contract binding, 250-row roundtrip, cross-product rights firewall i provider cost guard są zielone lokalnie.
7. Dwa pełne przebiegi utrzymały 47/47 tych samych klasyfikacji i kodów wyjścia.
8. Audyt zależności ustalił dokładny denominator: **70/618** wymaganych tarballi jest w źródle, **548** brakuje.

## Najkrótsza uczciwa droga do pierwszych FINAL

### Faza A — dependency i narzędzia

1. Pozyskać dokładne archiwa React 19.2.7, ReactDOM 19.2.7, TypeScript 5.9.3 i PGlite 0.5.4 albo wykonać świeży, exact-lock `npm ci` z pełnym receipt’em.
2. Odtworzyć pełny lock-bound dependency tree i sprawdzić platform-native resolution.
3. Node 24.18.0 + npm 11.16.0.
4. TypeScript, ESLint zero-warning, Webpack, Turbopack, smoke, browser, PDF i PL/EN/DE.

### Faza B — wspólne staging unlock

5. Lokalny Supabase/PostgreSQL albo autoryzowany Supabase Free.
6. Migracje, service role, dwa JWT, RLS i cross-account denial.
7. Write/readback, rollback, concurrency, export/delete.
8. DB + Storage backup/restore i post-restore ownership/RLS.

### Faza C — najbliższe row candidates

9. Browser Basic: real authorized input → safe fetch → durable store → account readback.
10. Risk Indicator: staging migrations/RLS/history/restore/deployed HTTP.
11. Audit Basic: real supported input → evidence → findings → remediation/retest → immutable PDF same-blob.
12. Market Impact: deployed route with rights-safe book/AMM or canonical `NO_USABLE_ORDER_BOOK`.

### Faza D — Audit quorum

13. Sourcify/self-controlled chain/DEX Screener/4byte/open-security lanes.
14. Pro: 5 live / 4 strict / 3 families / 6 evidence rows.
15. Advanced: 6 live / 5 strict / 4 families / 10 evidence rows.
16. Generalization pack; zero cherry-pick.

### Faza E — tiery i paid value

17. Browser Pro/Advanced.
18. Audit Pro/Advanced.
19. Shield B/P/A.
20. Shield Pro B/P/A.
21. 10/10 matched-input paid transitions.

### Faza F — Real Markets i standalone

22. Real Markets Basic 6,231 critical cells: real/right-safe lub exact fail-closed.
23. Pro 8,283 i Advanced 11,447: rzeczywiste obserwacje, semantyka, rights, matched value.
24. Shield Map, Whale Watch, Angel real model/hardware/evaluation.

### Faza G — closure

25. Exact final bytes + pełny engineering stack.
26. Exact Windows Server 2025.
27. 20 owner-authorized end-to-end row executions.
28. Dopiero wtedy `Customer FINAL = 20/20`.

### Faza H — po 20/20

29. 100 personas × 24 steps.
30. 50 Audit cases × 3 tiers × ≥6 reviewer roles.
31. Full Angel real-model campaign.
32. Accessibility/performance/stability, polish i post-polish regression.
33. External pilot, human AppSec/legal, convergence i osobne GO_PAID/LIVE gates.

## Zasada

Nie podbijamy licznika za fixture, test-only shim, pojedynczy pakiet, lokalny mock, sam build ani działający endpoint bez praw. R4 jest realnym skróceniem dystansu, ale **Customer FINAL pozostaje 0/20** do pełnego end-to-end dowodu.
"""
(ROOT / "VELMERE_MAPA_DROGI_DO_TOPKI_SWIATA_R4_2026-08-22.md").write_text(roadmap)

status = f"""VELMÈRE CURRENT CANDIDATE STATUS — R4
Date: 2026-08-22
Canonical parent: P101R1
Candidate: AUDITED_CURRENT_SOURCE_CANDIDATE_R4

CUSTOMER_FINAL=0/20
PAID_VALUE_FINAL=0/10
GLOBAL=NO_GO_STOP_SELL
LOCAL_CAMPAIGN_PASS=37/47
LOCAL_CAMPAIGN_ACTUAL_FAILURES=0
DEPENDENCY_WITHHELD=7
AUTHORIZED_RUNTIME_WITHHELD=1
EXACT_WINDOWS_WITHHELD=1
EXTERNAL_RECEIPT_ARGUMENT_NOT_RUN=1
EXACT_REQUIRED_TARBALLS_PRESENT=70/618
EXACT_REQUIRED_TARBALLS_MISSING=548

R4 MATERIAL MOVEMENT:
- exact source-embedded zod@3.25.76 restored for bounded local tests;
- test-only next/server after() boundary added and production-isolation verified;
- 8 previously dependency-WITHHELD tests now PASS;
- Market Impact canonical NO_USABLE_ORDER_BOOK runtime now PASS local;
- two complete 47-test runs have identical classification/exit outcomes;
- exact dependency source denominator established.

NO CREDIT CLAIMED FOR:
- complete dependency tree or npm ci;
- production Next/React/PGlite;
- authorized Supabase/PostgreSQL staging;
- field-level legal rights;
- exact Windows Server 2025;
- Customer FINAL, GO_PAID or LIVE.

NEXT_HIGHEST_VALUE:
1. exact React/ReactDOM/TypeScript/PGlite + full dependency closure;
2. exact engineering gates;
3. authorized two-account staging/restore;
4. Browser Basic, Risk Indicator, Audit Basic and Market Impact physical row executions;
5. Audit quorum, Real Markets observations, Angel real model;
6. exact Windows final-byte replay.
"""
(ROOT / "VELMERE_R4_CURRENT_CANDIDATE_STATUS_2026-08-22.txt").write_text(status)

# Full Polish progress table.
lines = [
    "# VELMÈRE — TABELA DROGI `0/20 → 20/20` — R4",
    "",
    "Canonical parent: **P101R1**  ",
    "Candidate: **AUDITED_CURRENT_SOURCE_CANDIDATE_R4**  ",
    "Customer FINAL: **0/20**  ",
    "Paid value FINAL: **0/10**  ",
    "Global: **NO_GO / STOP_SELL**",
    "",
    "> R4 odblokowuje osiem realnych testów lokalnych, ale test-only shim, pojedynczy pakiet i kampania lokalna nie są row-level FINAL.",
    "",
    "## Zmiana względem R3",
    "",
    "| Oś | R3 | R4 | Uczciwy wynik |",
    "|---|---:|---:|---|",
    "| Local current-execution | 29 PASS / 47 | **37 PASS / 47** | +8 wykonanych PASS, 0 rzeczywistych FAIL. |",
    "| Dependency WITHHELD | 15 | **7** | Pozostały 2 React/TSX i 5 PGlite. |",
    "| Market Impact dedicated runtime | WITHHELD | **PASS** | Kanoniczny `NO_USABLE_ORDER_BOOK`, bez syntetycznej płynności. |",
    "| Exact dependency source closure | niepoliczona | **70/618 present; 548 missing** | Lock zgadza się z P42; pełny `npm ci` nadal nieudowodniony. |",
    "| Repeatability | wybrane komendy | **47/47 classification + exit stable** | 42/47 stdout byte-stable; brak fałszywego byte-identical claim. |",
    "| Test-only Next shim isolation | brak osobnego dowodu | **1,954 files / 0 refs** | Nie jest produkcyjnym Next runtime. |",
    "| Customer FINAL | 0/20 | **0/20** | Bez fałszywego podbicia. |",
    "",
    "## Pełne 20 wierszy",
    "",
    "| # | Wiersz | Stan | Zamknięte lokalnie do R4 | Co nadal blokuje FINAL | Następna realna egzekucja |",
    "|---:|---|---|---|---|---|",
]
for row in rows:
    closed = "<br>".join(f"✅ {item}" for item in row["r4ClosedLocalBoundaries"])
    blockers = "<br>".join(f"• `{item}`" for item in row["remainingBlockers"])
    next_action = row["r4NextInternalExecution"].replace("|", "\\|")
    lines.append(
        f"| {row['ordinal']} | **{row['displayName']}**<br>`{row['productId']}` | 🟡 WITHHELD<br>0 FINAL | {closed} | {blockers} | {next_action} |"
    )
lines += [
    "",
    "## Dokładne pozostałe dependency blockers",
    "",
    "| Testy | Brakująca dokładna warstwa |",
    "|---|---|",
    "| `test-public-proof-publication-boundary.ts`<br>`test-v4-verify-durable-registry-boundary.ts` | `react@19.2.7`, następnie `react-dom@19.2.7` i `typescript@5.9.3` dla TSX/runtime imports |",
    "| 5 × `*-pglite.mjs` | `@electric-sql/pglite@0.5.4` z realnym PostgreSQL/WASM, bez shimu DB |",
    "",
    "## Po osiągnięciu 20/20",
    "",
    "Dopiero po 20 owner-authorized end-to-end wykonaniach przechodzimy do 100 personas × 24 kroki, 50 Audit cases × 3 tiery × ≥6 reviewerów, pełnego real-model Angel, accessibility/performance/stability, polish, external pilot i human AppSec/legal.",
    "",
    "## Zasada",
    "",
    "Nie zwiększamy licznika za fixture, mock, pojedynczy odtworzony pakiet, test-only shim, sam build ani endpoint bez praw. Failure zmienia stan, nie prawdę.",
]
(ROOT / "VELMERE_20_OF_20_PROGRESS_TABLE_R4_2026-08-22.md").write_text("\n".join(lines) + "\n")

recipe = {
    "schemaVersion": "velmere.p101r1.r4.package-build-recipe.v1",
    "checkpoint": "P101R1",
    "candidate": "R4",
    "parentCandidate": "R3",
    "inputMode": "CURRENT_AUDITED_SOURCE_TREE_EXCLUDING_SELF_REFERENTIAL_MANIFEST_FILES_AND_GITIGNORED_VELMERE_RUNTIME",
    "recursiveDirtyWorktreePackaging": False,
    "ordering": "lexicographic-relative-path",
    "timestamp": "1980-01-01T00:00:00Z",
    "directoryEntries": 0,
    "zipCreateSystem": 0,
    "externalMode": "0600",
    "compression": "ZIP_DEFLATED",
    "compressionLevel": 1,
    "deterministicRebuildsRequired": 2,
    "manifest": "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv",
    "identityReceipt": "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json",
    "selfExclusions": [
        "CURRENT_CANDIDATE_CONTENT_MANIFEST.tsv",
        "CURRENT_CANDIDATE_RECEIPT.json",
        "CURRENT_CANDIDATE_TREE_IDENTITY_EXCLUDING_SELF.json",
        "VELMERE_R4_CURRENT_SOURCE_MANIFEST.tsv",
    ],
    "runtimeExclusions": [".velmere/", "node_modules/", ".git/"],
    "truthBoundary": "Packaging and byte identity only. It does not prove complete dependencies, production Next/React/PGlite, rights, providers, staging, exact Windows, Customer FINAL, GO_PAID or LIVE.",
}
(ROOT / "P101R1_R4_PACKAGE_BUILD_RECIPE.json").write_text(json.dumps(recipe, indent=2) + "\n")

print(json.dumps({
    "progressJson": str(progress_json.relative_to(ROOT)),
    "report": "VELMERE_R4_CONTINUATION_EXECUTION_REPORT_2026-08-22.md",
    "table": "VELMERE_20_OF_20_PROGRESS_TABLE_R4_2026-08-22.md",
    "map": "VELMERE_MAPA_DROGI_DO_TOPKI_SWIATA_R4_2026-08-22.md",
    "status": "VELMERE_R4_CURRENT_CANDIDATE_STATUS_2026-08-22.txt",
    "recipe": "P101R1_R4_PACKAGE_BUILD_RECIPE.json",
}, indent=2))
