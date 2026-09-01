# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA

**Stan po pełnym przyjęciu P101R1, audycie 14 paczek handoffu, odzyskaniu post‑P101/V4 worktree oraz dodatkowym hardeningu wykonanym w tej sesji**  
**Data:** 2026-08-22  
**Klasyfikacja dokumentu:** bieżąca mapa wykonawcza / nie jest promocją `FINAL`, `GO_PAID` ani `LIVE`

---

## 1. Jednozdaniowa prawda

Velmère ma obecnie **bardzo mocny, zweryfikowany techniczny checkpoint P101R1** oraz materialny post‑P101/V4 kandydat źródłowy, ale nadal ma **`Customer FINAL 0/20`**. Najkrótsza droga do topki świata nie prowadzi już przez kolejne lokalne abstrakcje, tylko przez: **jednoznaczne prawa do pól → darmowy autoryzowany staging → realne owner‑controlled customer executions → matched-input tier value → finalne kampanie AI/UI/security → polish → convergence → zewnętrzny pilot**.

---

## 2. Authority i aktualna hierarchia prawdy

1. **Master Directive V2 R1** — current master execution authority.
2. **Canonical Owner Directive V17** — prawdziwa topologia produktu.
3. **P101R1** — ostatni kompletny i niezależnie zweryfikowany canonical checkpoint.
4. **Owner Override V4** — aktualna kolejność wykonawcza: zero‑euro/free‑first, realne tabele, AI campaigns teraz, internal customer execution oddzielone od external pilot.
5. **Post‑P101/V4 audited current source candidate** — P101R1 + 59 źródłowych dodatków + 58 źródłowych zmian z odzyskanego worktree + dodatkowe poprawki tej sesji.

### Exact P101R1

- SOURCE_ONLY: `216,245,335 B`
- SHA‑256: `c2b7ab7a924fa87265518246a9bbac9da44f674e72c776da21b5ea1b4040ed3d`
- ZIP entries: `9,636`
- product/source projection: `7,319 files / 208,488,813 B`
- source projection SHA‑256: `78f56e9bf906fa5181d7db289ca1aa96f9eda102549a4898bed11184f0b1e4d2`
- commit: `978fd9c58eee6e4ee6b0affe514c7dadd918b5f8`
- tree: `94a269e987ecb629f932d3bb35467432a56dd15b`

### Ważna granica

Najnowszy przekazywany ZIP jest **audytowanym current-source candidate**, a nie P102/P103. Nie wolno nadać nowego canonical checkpointu bez pełnego, aktualnego proofu exact toolchain, TypeScript, ESLint, obu buildów, runtime, pakowania i — gdzie wymagane — stagingu. P101R1 pozostaje canonical parentem.

---

## 3. Co zostało odzyskane i zweryfikowane z paczek

Przyjęto i zweryfikowano kompletny zestaw 14 paczek handoffu, z wyjątkiem ciężkiego `08_EXECUTION_SANDBOXES`, który nie był potrzebny do odzyskania aktualnego źródła. SHA‑256 każdej przesłanej paczki zgadzał się z `UPLOAD_SHA256.csv`.

Porównanie aktualnego worktree do P101R1:

| Oś | Wynik |
|---|---:|
| Current worktree files | 9,897 |
| P101R1 files | 9,636 |
| Wszystkie dodatki | 261 |
| Wszystkie zmiany | 60 |
| Usunięcia | 0 |
| Źródłowe dodatki po odrzuceniu receipt/build noise | 59 |
| Źródłowe zmiany | 58 |
| Merge markers / NUL / uszkodzony JSON / syntax errors w sprawdzonym delta scope | 0 |
| Secret-pattern matches w source delta | 0 |

Odzyskany V4 obejmuje m.in.:

- oddzielną topologię i server-bound path Shield Pro;
- customer-safe table field receipts;
- SEC EDGAR, CFTC COT oraz World Bank WDI jako ściśle sklasyfikowane reference lanes;
- Real Markets rights-before-network firewall;
- Verify registry, search, badge, Audit→Verify initial producer i continuous monitor;
- account data export;
- account erasure request/status/cancel boundary;
- Angel grounding boundary;
- 117-migration local regression work;
- AI campaign harnessy `2400 + 900`;
- liczne poprawki bezpieczeństwa i operacyjne z P101.

---

## 4. Dodatkowa realna praca wykonana po audycie

### 4.1 Verify continuous monitor hardening

W `lib/verify/verify-continuous-monitor-worker.ts` dodano fail-closed walidację:

- claim batch nie może przekroczyć requested limit;
- `attempt_count >= 1`;
- unikalne `jobId` w batchu;
- unikalne `publicProofId` w batchu;
- `dueAt` nie może wypaść poza dopuszczone okno claimu;
- settle receipt musi mieć możliwą relację `state ↔ currentStatus ↔ retry/dead-letter`;
- health receipt musi zachować relacje licznikowe;
- niepoprawny claim zatrzymuje proces przed provider observation.

Test runtime został rozszerzony o batch overflow, duplikaty, future due, attempt=0, niemożliwe settle states i niemożliwą telemetrię health.

**Repeatability:** 2/2 byte-identical output  
SHA‑256: `bfc62b1f03576529210f010492ae68d739402e5cb00f9f5a9137b3970ccd45e8`

### 4.2 Audit release-gate test isolation i freshness

W `tests/security/audit-execution-packet-release-gate.test.ts` naprawiono realny defect test isolation: współdzielony mutowalny P82 receipt powodował, że future-timestamp test zatruwał kolejne scenariusze. Każdy draft otrzymuje teraz `structuredClone`.

Dodano także jawne negatywy:

- stale deployment snapshot;
- snapshot from future.

**Repeatability:** 2/2 byte-identical output  
SHA‑256: `fa97768103148a44d38776cf7c8e89d15a1a2dbf091a80d0449979ebfaef956e`

### 4.3 Delta-wide syntax/transpile audit

- sprawdzone TS/TSX/JS/MJS/CJS files: `101`
- parse/transpile error files: `0`

### 4.4 AI campaign replay

Ponownie wykonano oraz niezależnie zweryfikowano:

- `100` AI personas;
- `24` kroki na personę;
- `2,400` simulated journey steps;
- wszystkie 20 product rows pokryte po `100` razy;
- `50` Audit cases;
- `3` tiery;
- `6` reviewer roles;
- `900` reviewer judgments;
- development/validation/holdout split `30/10/10`;
- zero provider/model/network calls;
- 2/2 byte-identical output.

To jest **AI_SIMULATED_BOUNDED**, nie external customer evidence. Obecny campaign sam raportuje `productTaskCompletions = 0`, ponieważ bada truth/adversarial oracle, a nie rzeczywiste działanie UI/stagingu. Następna finalna kampania musi działać na realnych started-server customer journeys.

---

## 5. Bieżąca tabela 20 customer rows

**Globalny numerator pozostaje `0/20`.** Poniższa tabela rozdziela stan mechanizmu od Customer FINAL.

| # | Canonical row | Obecny stan techniczny | Co już działa / istnieje | Najkrótszy uczciwy blocker do internal FINAL |
|---:|---|---|---|---|
| 1 | `audit.basic` | **PARTIAL / PASS_BOUNDED** | account-owned worker, BSC identity, lease/idempotency, immutable artifact plumbing, Audit→Verify producer | rights-safe current input + autoryzowany staging DB/RLS/JWT + exact immutable PDF account readback + owner-controlled customer execution |
| 2 | `audit.pro` | **PARTIAL / PASS_BOUNDED** | exact paid PDF path, release packet, evidence dimensions | real 5 live / 4 strict / 3 families / 6 rows + rights + staging + matched-input Pro value |
| 3 | `audit.advanced` | **PARTIAL / PASS_BOUNDED** | automated Advanced, exact PDF path, current release gate | real 6 live / 5 strict / 4 families + additional independent rights-safe source + matched-input Advanced value |
| 4 | `browser.basic` | **STRONG PASS_BOUNDED** | P101 render-once/store-first, dual builds, smoke, 6-profile browser baseline | current post-V4 full engineering rerun + authorized durable storage/account readback + rights-safe real input |
| 5 | `browser.pro` | **STRONG PASS_BOUNDED** | no silent downgrade, exact tier identity | Basic blockers + entitlement + matched-input material Pro value |
| 6 | `browser.advanced` | **STRONG PASS_BOUNDED** | exact paid-tier delivery, automated path | Pro blockers + matched-input material Advanced value |
| 7 | `shield.basic` | **PARTIAL / FAIL-CLOSED** | rights preflight, zero provider calls when blocked, customer-safe field projection | rights-safe current evidence + calibrated ground truth + deployed customer route |
| 8 | `shield.pro` | **PARTIAL / FAIL-CLOSED** | Shield tier separation and projection infrastructure | same input, material Pro value + entitlement + real data/rights/calibration |
| 9 | `shield.advanced` | **PARTIAL / FAIL-CLOSED** | deeper tier contract exists | independent multi-source evidence + calibrated matched Advanced value + deployment |
| 10 | `shield_pro.basic` | **PARTIAL / PASS_BOUNDED** | separate product identity, server analysis client, customer-safe table projection | real investigator case/workspace route + data/rights + auth/concurrency/recovery + started-server execution |
| 11 | `shield_pro.pro` | **PARTIAL / PASS_BOUNDED** | distinct Pro entitlement/path locally implemented | Basic blockers + matched-input material workflow value + full dependency/runtime proof |
| 12 | `shield_pro.advanced` | **PARTIAL / PASS_BOUNDED** | distinct Advanced path/tier truth locally implemented | Pro blockers + material adjudication/evidence/export value + no downgrade/leak |
| 13 | `real_markets.basic` | **PARTIAL / FAIL-CLOSED** | rights-before-network architecture, SEC/CFTC/WDI/ECB reference lanes, 250-row cache proof inherited | exact field rights/currentness/session/time + real customer table + final started-server execution |
| 14 | `real_markets.pro` | **PARTIAL / FAIL-CLOSED** | multi-source/reference infrastructure | Basic blockers + matched-input material Pro fields/value + entitlement |
| 15 | `real_markets.advanced` | **PARTIAL / FAIL-CLOSED** | scenario/conflict architecture pieces | Pro blockers + matched-input conflict/scenario value and real data |
| 16 | `shield_map` | **PASS_BOUNDED LOCAL** | combobox/a11y/receipt identity improvements | real node/edge source semantics, rights, currentness, privacy and deployed route |
| 17 | `market_impact` | **CORRECTLY UNAVAILABLE / PASS_BOUNDED** | canonical `NO_USABLE_ORDER_BOOK`, null book, no synthetic liquidity, no network leak | rights-safe real order-book/depth + calibration, or deploy product with truthful unavailable behavior per contract |
| 18 | `whale_watch` | **PASS_BOUNDED LOCAL** | canonical event identity, timestamp/currentness hardening | real chain/finality/reorg data, labels rights, bridge/double-count proof, deployed route |
| 19 | `angel` | **PARTIAL / FAIL-CLOSED** | rights gate before Gemini, memory-delete fail-closed, grounding boundary source, cost governor inherited | provider/Terms/privacy/age/cost owner decision + full dependencies + real staged provider evaluation + final 120+ cases |
| 20 | `risk_indicator` | **STRONG LOCAL CONTRACT / STAGING-BLOCKED** | Risk History identity, pagination, temporal alignment, customer UI contract | P91/P93/P94 migrations on staging + service role/RLS/two JWT + rollback/concurrency/restore + started-server customer route |

---

## 6. Co trzeba zrobić po kolei — plan do topki świata

### FAZA 0 — promote tylko prawdę

1. Zachować P101R1 jako frozen canonical.
2. Traktować nowy ZIP jako `AUDITED_CURRENT_SOURCE_CANDIDATE`.
3. Nie nazywać go P102 dopóki nie przejdzie pełnego exact current-byte stacku.
4. Po dostarczeniu wymaganych dependencies/toolchain uruchomić pełny rerun i dopiero wtedy zbudować nowy unikalny checkpoint.

### FAZA 1 — darmowy staging i exact environment

#### 1A. Supabase/PostgreSQL

Największy wspólny lewar dla wielu rows:

- disposable Supabase Free staging albo autoryzowany local Supabase;
- wszystkie ordered migrations;
- schema parity;
- service-role separation;
- dwa owner-controlled users/JWT;
- cross-account non-disclosure;
- RLS;
- rollback/concurrency/idempotency;
- exact readback;
- same-blob artifact paths;
- backup/restore drill.

Bez sekretów w chat/log/source.

#### 1B. Windows Server 2025

- GitHub Actions `windows-2025` w included/free quota albo prywatny authorized runner;
- Node `24.18.0`;
- npm `11.16.0`;
- current source exact hash;
- dependency install/native probes;
- full TypeScript;
- ESLint zero-warning;
- Webpack/Turbopack;
- runtime/browser/PDF gates;
- immutable receipts.

### FAZA 2 — rights-safe data backbone za 0 EUR

Dla każdego pola:

1. official public/open source;
2. direct chain evidence;
3. keyless API;
4. free API key;
5. free tier;
6. paid provider wyłącznie jako owner decision.

Oddzielić:

- techniczną dostępność;
- semantykę;
- display rights;
- commercial rights;
- derived rights;
- cache/retention;
- PDF/export;
- attribution;
- freshness.

Priorytet: pola odblokowujące jednocześnie Shield, Real Markets, Browser i Audit.

### FAZA 3 — najpierw tabele klienta

#### Shield B/P/A

- real approved fields;
- rights preflight przed socketem;
- canonical asset identity;
- actual risk/evidence;
- currentness/calibration;
- Risk History;
- loading/partial/stale/withheld/error;
- sort/filter/search/mobile/keyboard/screen-reader;
- no blocked values;
- matched tier value.

#### Shield Pro B/P/A

- real server-bound workspace/case;
- customer table;
- commands/action boundaries;
- entitlement;
- concurrency/retry/recovery;
- evidence/export;
- exact B/P/A material differences.

#### Real Markets B/P/A

- exact semantic class of each field;
- venue/session/timezone;
- precision/unit/currency;
- reference != live;
- stale/cache/fallback;
- rights/currentness;
- matched tier value.

### FAZA 4 — Audit i Browser jako end-to-end produkty

#### Audit

- exact supported input scope;
- secure intake/authorization;
- chain/address/source/deployment identity;
- current evidence;
- findings/severity/exploitability/uncertainty;
- remediation/retest;
- redaction;
- B/P/A matched input;
- immutable PDFs;
- account delivery;
- Verify publication/revalidation;
- internal customer execution.

#### Browser

- real input/data rights;
- tier identity;
- durable same-blob store;
- account readback;
- PL/EN/DE;
- full browsers/accessibility;
- B/P/A value.

### FAZA 5 — standalone i trust layer

- Risk Indicator real staging chain;
- Shield Map real source;
- Whale Watch real chain/finality/labels;
- Market Impact real order book or truthful unavailable product;
- Verify registry/search/history/monitor/badge/revalidation;
- no spoofing, no enumeration, no stale green badge.

### FAZA 6 — final AI/customer/reviewer campaigns

Current `2400/900` is a valid deterministic oracle campaign but not UI/product completion.

Final campaigns must execute actual current started-server customer paths:

- 100 personas × 24 journeys;
- 20 rows;
- real UI/API states;
- PL/EN/DE;
- desktop/mobile;
- success/partial/stale/withheld/error;
- task completion and comprehension;
- fix → rerun.

Audit:

- 50+ cases × 3 tiers × 6 roles;
- real final artifacts;
- ground-truth holdout;
- FP/FN/disagreement/adjudication;
- matched paid value.

Angel:

- 120+ cases;
- grounding/hallucination/uncertainty;
- prompt injection/tool misuse;
- stale/conflicting evidence;
- PL/EN/DE;
- long context;
- memory/privacy/cost.

### FAZA 7 — global security, privacy, operations, cost

- auth/account lifecycle;
- RLS/IDOR/BOLA;
- wallet auth;
- SSRF/DNS rebinding/TLS/IP pinning;
- rate/cost limits;
- cache/response swap;
- PDF active content;
- Verify/badge spoofing;
- AI injection/tool boundaries;
- logs/metrics/alerts/queues;
- provider/DB/storage outages;
- performance baselines;
- restore drill;
- supply chain/SBOM/licenses/provenance.

### FAZA 8 — 10/10 paid transitions

Matched input only:

- Audit B→P and P→A;
- Browser B→P and P→A;
- Shield B→P and P→A;
- Shield Pro B→P and P→A;
- Real Markets B→P and P→A.

Material value, no padding, no paid leak, no downgrade.

### FAZA 9 — final visual polish

Dopiero po functional/security freeze:

- world-class hierarchy/typography;
- tables/charts/popovers;
- withheld/empty/error states;
- PDFs;
- Verify/badge;
- account/Angel;
- desktop/mobile/accessibility/i18n.

### FAZA 10 — post-polish + convergence

- full current-byte regressions;
- affected AI campaigns;
- 3 clean rounds without material defect;
- deterministic checkpoint;
- `FINAL_CANDIDATE`.

### FAZA 11 — external proof i launch

- zero-cost pilots with consented small projects;
- independent human AppSec review;
- lawyer rights/privacy review;
- remediation/retest;
- canary deployment;
- rollback/kill switch/monitoring;
- `PILOT_READY → GO_PAID → LIVE`;
- `WORLD_CLASS_PROVEN` only after real operational evidence over time.

---

## 7. Najwyższe priorytety następnego wykonania

1. **Staging Free + two accounts** — największy shared blocker.
2. **Full exact dependency/current-byte engineering rerun** — konieczny do promocji candidate.
3. **Field-level rights decisions/free alternatives** — odblokowanie prawdziwych tabel.
4. **Shield/Shield Pro/Real Markets started-server tables**.
5. **Audit Basic first internal execution + exact PDF/account delivery**.
6. **Risk Indicator staging execution**.
7. **Verify monitor staging and badge state transitions**.
8. **Matched-input B/P/A**.
9. **Final UI-based AI campaigns**.
10. **Polish/convergence**.

---

## 8. Zero-euro owner action packs

### Staging

Właściciel musi tylko:

- wskazać/create disposable Supabase Free project we własnym koncie;
- przekazać sekrety przez secret store, nie chat;
- utworzyć dwa testowe konta;
- autoryzować non-production restore drill.

Agent/integrator wykonuje migracje i proof.

### Darmowe klucze

Dla każdego providera:

- current official free plan;
- exact Terms/version;
- required env variable;
- limit;
- exact field/use;
- no secret in logs;
- fallback if declined.

### Legal

Prawnik dostaje field/provider/use matrix, a nie ogólne pytanie „czy API jest legalne”.

### Pilot

3–5 teams / około 10–20 users może zostać pozyskanych bez budżetu przez darmowe pilotażowe audyty, ale dopiero po internal closure i zgodzie właściciela na outreach.

---

## 9. Co można bezpiecznie usunąć z 9 GB — dopiero po zachowaniu ZIP-ów

Po zachowaniu:

- P101R1;
- current candidate;
- ledger/map;
- exact logs potrzebne do evidence;

można odtworzyć i zwykle usunąć lokalnie:

- `node_modules`;
- `.next*`;
- Playwright browser binaries;
- cache;
- test-results/playwright-report;
- local-regression-temp;
- stare build outputs;
- duplikaty rozpakowanych P99/P101 po potwierdzeniu hashów.

Nie usuwać przed osobnym KEEP/DELETE audit:

- latest worktree;
- git metadata;
- checkpoint output;
- canonical source;
- current execution state;
- V4 execution logs;
- unpromoted source changes.

---

## 10. Pięć końcowych samokontroli

### Check 1 — Czy ustalono jedną current truth?

**Tak.** P101R1 pozostaje canonical; post-P101/V4 jest current candidate, nie fałszywy P102.

### Check 2 — Czy wykonano wszystko możliwe bez wymaganych dependencies/stagingu?

**Tak w dostępnym zakresie.** Odtworzono wszystkie paczki, porównano source, wykonano syntax/transpile audit, uruchomiono możliwe testy, ponowiono kampanie AI, naprawiono realny Verify monitor defect i test isolation Audit. Testy wymagające `zod`, React, Supabase SDK/PGlite oraz exact Node/npm/build pozostają jawnie WITHHELD.

### Check 3 — Czy licznik 0/20 został sztucznie podniesiony?

**Nie.** Żaden fixture, oracle campaign, local fail-closed mechanism ani build baseline nie został nazwany Customer FINAL.

### Check 4 — Czy przekazywany source może być użyty do dalszej pracy?

**Tak.** Jest to czysty candidate z P101 parentem, pełnym source V4 i dodatkowymi poprawkami. Ma manifest, current candidate receipt, deterministyczny ZIP i weryfikację clean-unpack. Nie jest jednak release checkpointem bez full current-byte engineering rerun.

### Check 5 — Czy pozostała jeszcze materialna praca, którą można wykonać bez owner/staging/dependencies?

Po obecnym audycie największe pozostałe kroki wymagają co najmniej jednego z: dependencies/exact toolchain, autoryzowany staging, free credentials, rights decision albo started-server runtime. Dalsze lokalne modyfikacje bez tych wejść groziłyby powrotem do over-engineeringu. Następny ruch powinien być aktywacją środowiska, nie kolejną lokalną abstrakcją.

---

## 11. Definicja sukcesu

Velmère będzie gotowe technicznie do `FINAL_CANDIDATE`, gdy:

- 20/20 rows ma własny kompletny internal customer chain;
- 10/10 paid transitions ma material matched-input value;
- fields mają rights/currentness;
- auth/staging/storage/restore są realnie udowodnione;
- AI/customer/reviewer/security campaigns przechodzą na final bytes;
- browsers/accessibility/i18n przechodzą;
- supply chain/performance/operations są zamknięte;
- final polish przeszedł post-polish regression;
- trzy clean convergence rounds nie znajdują materialnego problemu.

Zewnętrzni klienci, niezależni ludzie, formalny prawnik i produkcyjna decyzja nadal pozostają osobnymi późniejszymi dowodami dla pilot/GO_PAID/LIVE/WORLD_CLASS_PROVEN.
