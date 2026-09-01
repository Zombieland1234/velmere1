# VELMÈRE — MAPA DROGI DO TOPKI ŚWIATA — CURRENT

Stan fizyczny na: **2026-08-25**

**Customer FINAL: 0/20**

**Paid Value FINAL: 0/10**

**Global: NO_GO / STOP_SELL**

## Najważniejsza bieżąca prawda

- Formalny historyczny canonical checkpoint pozostaje **P101R1**.
- Ostatni prawidłowo promowany dowód wykonawczy to **R7 v15**: Windows Server 2025, Node 24.18.0, npm 11.16.0 i **52/52 PASS × 2**, związane z GitHub run `32800353694` i staging source authority.
- Po v15 powstał materialny, ale jeszcze **niepromowany successor**. Naprawia on hostingowy lifecycle po zmianie obrazu Vercel oraz dodaje append-only historię source authority. Nie otrzymuje creditu Windows ani Customer FINAL przed własnym dokładnym runem i bindingiem.
- Bieżący hostingowy kontrakt został fizycznie sprawdzony na Node 24.19.0 z dokładnym npm 11.16.0. Preflight przechodzi bez blockerów, watchdog ma 54/54 PASS, a runtime bundle boundaries 8/8 PASS. Dokładny kontrakt Windows pozostaje celowo sztywny i odrzuca Node 24.19.0/npm 11.9.0.
- Migracja append-only `20260825000012_r7_source_authority_append_only_history.sql` została zastosowana na staging. UPDATE, DELETE i TRUNCATE historii są blokowane; bieżący związany rekord v15 został zachowany.
- Istniejące staging proofy Auth, dwóch sesji/JWT, RLS, tenant isolation, storage, digest, reconnect, rollback, concurrency, export, delete, backup i restore są wartościowym wspólnym fundamentem. Nie zastępują świeżego row-specific customer route.
- Żaden z 20 produktów nie przeszedł jeszcze pełnego kontraktu Customer FINAL na obecnych końcowych bajtach. Dlatego licznik uczciwie pozostaje 0/20.

## Stan 20 produktów

| # | Produkt | Stan | Co już działa | Co jeszcze musimy zrobić |
|---:|---|---|---|---|
| 1 | Audit Basic | 🟡 blisko | Worker, customer-safe output, lifecycle konta oraz wspólne Auth/RLS/storage/recovery. | Przepuścić realny wspierany input przez właściwą trasę Audit: evidence → findings → retest → immutable exact PDF → zapis i readback; domknąć field rights. |
| 2 | Audit Pro | 🟠 dużo pracy | Wspólna baza Audit i nieobniżony próg 5 live / 4 strict / 3 families / 6 evidence rows. | Fizycznie osiągnąć 5/4/3/6 z rights-safe niezależnymi upstream roots oraz pokazać materialną wartość Pro na tym samym wejściu. |
| 3 | Audit Advanced | 🟠 dużo pracy | Wspólna baza Audit i nieobniżony próg 6 live / 5 strict / 4 families / 10 evidence rows. | Dodać niezależny strict-capable lane, osiągnąć 6/5/4/10 i udowodnić materialną wartość Advanced na matched input. |
| 4 | Browser Basic | 🟡 blisko | Promowany v15 Windows/source authority PASS oraz wspólny Auth/RLS/storage/digest/reconnect/restore; rights firewall i accessibility boundaries. | Promować obecny successor, wdrożyć go i wykonać świeży Browser/Lens → actual product route → visible result → exact PDF/store/readback → USER_A own/USER_B deny → restore → deployed readback. |
| 5 | Browser Pro | 🟠 dużo pracy | Wspólne rights/a11y/storage oraz tier identity bez silent downgrade. | Ten sam realny input, entitlement Pro, mierzalna dodatkowa wartość i trwała dostawa przez actual route. |
| 6 | Browser Advanced | 🟠 dużo pracy | Granice tier identity i export istnieją. | Ten sam input, materialny Advanced context/conflict/export, field export rights i durable entitlement route. |
| 7 | Shield Basic | 🟠 dużo pracy | Table/semantic contract i rights-before-network firewall fail-closed. | Podłączyć rights-safe aktualne evidence, skalibrowane risk/uncertainty, provenance/currentness i deployed customer route. |
| 8 | Shield Pro | 🟠 dużo pracy | No-downgrade i nullowanie wyniku przy blocked rights. | Realne evidence/calibration, matched-input Pro value oraz entitlement-isolated route. |
| 9 | Shield Advanced | 🟠 dużo pracy | DERIVED receipt binding i poprawne WITHHELD semantics. | Multi-source rights-safe evidence, konflikty/uncertainty/calibration, Advanced value i deployed entitlement. |
| 10 | Shield Pro Basic | 🟠 dużo pracy | Osobna tożsamość investigator workflow, rights firewall i customer-safe projection. | Realny tenant-bound case workflow, auth/state transitions, provider failure, concurrency, recovery i deploy. |
| 11 | Shield Pro Pro | 🟠 dużo pracy | Odrębna tier identity oraz granice raw-error/no-downgrade. | Realny przypadek Basic plus materialne Pro workflow/monitoring value i entitlement. |
| 12 | Shield Pro Advanced | 🟠 dużo pracy | Advanced identity i export-right boundary. | Realne adjudication/export/handoff value, field export rights, recovery i tenant isolation. |
| 13 | Real Markets Basic | 🟠 dużo pracy | Requiredness, semantic state machine i field-risk binding; system nie fabrykuje brakujących danych. | Zmapować launch scope field-by-field do lawful sources/missing states i wykonać aktualną durable customer table route. |
| 14 | Real Markets Pro | 🟠 dużo pracy | Fail-closed field rules i wspólna table machinery. | Realne multi-source observations, rights/currentness/corporate actions oraz matched Pro value i entitlement. |
| 15 | Real Markets Advanced | 🟠 dużo pracy | Duplicate/conflict/missing states fail-closed. | Realny quorum/conflict/scenario dataset, rights oraz matched Advanced value. |
| 16 | Shield Map | 🟠 dużo pracy | Wspólne accessibility, customer-safe i telemetry boundaries. | Realne lawful nodes/edges, provenance, label rights, privacy, currentness/confidence i deployed interaction. |
| 17 | Market Impact | 🟠 dużo pracy | Kanoniczny `NO_USABLE_ORDER_BOOK` przechodzi i nigdy nie inventuje liquidity. | Wykonać deployed current-input route z lawful book albo prawidłowym unavailable oraz thin/stale/manipulated-book i model-domain tests. |
| 18 | Whale Watch | 🟠 dużo pracy | Canonical chain-event identity i dedup foundation. | Real chain/block/finality/reorg, decimals, bridge/exchange-label uncertainty, rights, double-count negatives i deployed route. |
| 19 | Angel | 🟠 dużo pracy | Rights-before-model, cost guard, durable-memory delete fail-closed i części grounding boundaries. | Uruchomić zatwierdzony open/free/local real model, realne PL/EN/DE responses, 120+ adversarial/correctness cases, privacy/tool/tenant/latency/concurrency/failure route. |
| 20 | Risk Indicator | 🟡 blisko | Risk-history identity, pagination i methodology-version UI contracts oraz wspólne Auth/RLS/restore. | Podłączyć lawful/current evidence provider route, potem realny deployed current+history flow: methodology change, stale/missing, restore, account boundary i cross-product consistency. |

Podsumowanie stanów: **0 × ✅ FINAL, 3 × 🟡 blisko, 17 × 🟠 dużo pracy, 0 × 🔴 owner/external blocker, 0 × ⚪ nieuruchomione**.

## Co zostało właśnie domknięte w obecnym źródle

1. Oddzielono exact Windows runtime od bounded hosting runtime: Windows nadal wymaga dokładnie Node 24.18.0/npm 11.16.0, a Vercel może użyć nowszego Node 24.x przy nadal dokładnym npm 11.16.0 przez Corepack.
2. Hostingowy install wymusza pełny lifecycle `npm ci --ignore-scripts=false`; deployment preflight i segmented Turbopack build są uruchamiane bez zależności od systemowego npm Vercel.
3. Dodano append-only historię source authority bez omijania private/public boundary; bieżący v15 pozostał zachowany.
4. Kontrole po zmianie: hosting runtime PASS, preflight 0 blockerów, watchdog 54/54 PASS, source-authority separation 31/31 PASS, runtime bundle boundaries 8/8 PASS.
5. Przygotowany Browser Basic live-E2E harness ma pozytywne kontrole statyczne, ale nie jest jeszcze zdalnym customer proof i musi zostać związany z nową tożsamością successora.

## Najkrótsza uczciwa kolejność dalszej pracy

1. Zbudować exact identity i transport obecnego successora.
2. Wykonać exact GitHub write jednym drzewem/commitem i hosted Windows Server 2025: 52/52 PASS × 2.
3. Zapisać nowy source-authority record przez publiczny RPC, zachowując append-only historię; wymagać `exactWindowsStatus=PASS`, `githubShaBound=true`, `exactWindowsRunBound=true`.
4. Wdrożyć dokładnie te bajty na staging i sprawdzić health/readback. Jeśli Vercel rzeczywiście wymaga jawnego opt-in Corepack, jedyną minimalną konfiguracją właściciela będzie niejawny-niesekretny preview setting `ENABLE_EXPERIMENTAL_COREPACK=1`; najpierw należy wykonać próbę bez założenia tego blockera.
5. Odświeżyć dwa owner-controlled GoTrue contexts bez ujawniania tokenów.
6. Wykonać fresh Browser Basic actual product-route E2E. Dopiero pełny PASS może podnieść licznik 0/20 → 1/20.
7. Następnie domknąć Risk Indicator i Audit Basic, po czym przeliczyć wszystkie 20 rows z inherited common proof.
8. Skalować Browser/Audit/Shield/Shield Pro, następnie Real Markets i standalone products, zawsze field-by-field i fail-closed.
9. Po 20/20 domknąć 10/10 paid transitions na matched input i dopiero potem uruchomić kampanie 2400+ customer interactions, 900+ Audit judgments, 120+ Angel cases oraz security/provider/chaos/performance/a11y/i18n/cross-browser convergence.

## Owner action

**Na tym checkpointcie nie ma udowodnionej koniecznej akcji właściciela ani zakupu.** Zero-Euro Authority pozostaje bez zmian: `DO_NOT_BUY_PROVIDER_NOW = TRUE`. Brak darmowego klucza klasyfikujemy jako `FREE_CREDENTIAL_REQUIRED`, nie jako `PAID_PROVIDER_REQUIRED`. Produkcja, płatny provider, nowe Terms, publiczne claimy i zewnętrzny pilot pozostają późniejszymi osobnymi decyzjami.

## Po ludzku

Mamy nadal 0/20, bo żaden produkt nie przeszedł jeszcze całego świeżego procesu klienta na obecnych końcowych bajtach. Mamy jednak działający wspólny fundament Windows, bazy, kont, bezpieczeństwa i odtwarzania, a najnowsza poprawka usuwa konkretny problem wdrożenia oraz chroni historię source authority przed nadpisaniem. Najbliżej są Browser Basic, Audit Basic i Risk Indicator. Pierwszym realnym ruchem licznika będzie dopiero pełny Browser Basic od wejścia użytkownika aż do zapisanego wyniku, PDF-u, odczytu po koncie, odmowy drugiemu kontu i odczytu po restore. Właściciel nie musi teraz nic kupować.
