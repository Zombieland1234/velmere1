# Velmère Master Build Map — stan po PASS636

## Stan rdzenia

- PASS602–606 — VLM Brain evidence topology, progressive WebGL/2D i one-shot motion.
- PASS607–611 — wspólny Reader/PDF manifest, claim-source gate i dynamiczny A4.
- PASS612–616 — wspólny source-state Shield, mobile viewport governor i 10/14/20 tier depth.
- PASS617–621 — Real Markets bez krypto, exact search, provider lineage i adaptive table/cards.
- PASS622–626 — source registry, atomowe claimy, konflikty providerów, freshness synthesis i next-check planner.
- PASS627–631 — jedna konstytucja ruchu, warstw, scrolla, skeletonów, focus i contrast.
- PASS632–636 — fixed-window rate limit, audit chain, wallet consent boundary, export redaction i provider failure drills.

## Zakończone: Security Runtime PASS632–636

### PASS632 — Production rate-limit adapter
- prywatne, zahashowane boundary route/provider/user/client,
- fixed-window buckets zamiast przesuwnego TTL,
- standardowy `Retry-After`, jawny degraded mode, cooldown i deterministyczny jitter,
- single recovery probe bez thundering herd po odzyskaniu storage/provider.

### PASS633 — Audit event schema
- trwały łańcuch request → provider → claim → decision → export,
- source IDs, timestamps, confidence caps, outcome i trace/receipt,
- prywatny prompt zastąpiony digestem schematu,
- publiczny receipt bez actor fingerprint, surowego promptu i sekretów.

### PASS634 — Consent and wallet boundary
- read-only connect oddzielony od sign/typed data/transaction/approval,
- jawny chain/action/value/contract/spender/expiry przed zgodą,
- brak seed phrase, private key i niejawnego unlimited approval,
- czytelna granica PL/DE/EN w panelu portfela.

### PASS635 — Export redaction policy
- jedna polityka PDF/Reader/logs/receipts/security export,
- usuwanie sekretów, prompt internals, auth/cookies, raw IP i tokenów,
- maskowanie email/wallet/session/actor/client identifiers,
- deterministyczny receipt i leak gate przed oraz po serializacji PDF.

### PASS636 — Production failure drills
- offline, timeout, 429, malformed JSON, bad timestamp, partial payload i storage failure,
- każdy drill ma source state, confidence cap, retry policy i recovery path,
- fallback ani awaria nie mogą potwierdzić bieżącego faktu,
- Shield Analyze i Security Export używają tej samej macierzy awarii.

## Następny pakiet: Release proof PASS637–641

### Priorytet wykonawczy
1. uruchomić czysty Node.js 20 i zamrożony lockfile,
2. naprawić pełny semantic typecheck bez wyciszania błędów,
3. wykonać rzeczywisty `next build`,
4. przejść Chromium route matrix PL/DE/EN desktop/mobile,
5. zbudować jedną superseding capsule z dowodem buildu.

## Release proof PASS637–641

### PASS637 — Node 20 clean-install gate
- czyste środowisko zgodne z `engines`,
- `npm ci` z zamrożonym lockfile,
- raport deprecated/vulnerability bez ukrywania błędów.

### PASS638 — Full semantic typecheck
- pełne `tsc --noEmit`,
- usunięcie implicit-any i zerwanych aliasów,
- osobne gate’y server/client/worker.

### PASS639 — Next production build
- `next build`, raport tras i bundle,
- dynamic/static boundary audit,
- brak niejawnych runtime-only błędów.

### PASS640 — Chromium route matrix
- PL/DE/EN × desktop/mobile,
- Browser/Shield/Map/Brain/PDF/Real Markets,
- keyboard, touch, zoom 200%, reduced motion i forced colors.

### PASS641 — Superseding release capsule
- jeden aktualny ZIP i SHA-256,
- build proof, route matrix, lista zmian i master map,
- wycofanie przestarzałych paczek z instrukcji wdrożenia.

## PDF i evidence quality PASS642–646

### PASS642 — PDF/UA external validation lane
- veraPDF/PAC lub równoważny zewnętrzny gate,
- tag order, headings, alt text, language i table semantics,
- brak claimu zgodności bez dowodu.

### PASS643 — Reader/PDF visual parity matrix
- PL/DE/EN × Basic/Pro/Advanced,
- screenshot i page manifest parity,
- ekstremalnie długie tickery, źródła i słowa.

### PASS644 — Source outage replay lab
- missing/stale/conflict/partial/offline,
- deterministyczny replay Reader/PDF/Shield/Brain,
- jeden stan dowodu na wszystkich powierzchniach.

### PASS645 — Premium mobile performance budget
- INP, long tasks, layout shift i GPU frame budget,
- zamrażanie scen poza viewportem,
- test 320/360/390/430 px i słabszego urządzenia.

### PASS646 — Unified evidence release
- wspólny claim/source/timestamp/confidence ledger,
- Browser + Shield + Map + Brain + Real Markets,
- cross-surface identity i handoff bez utraty poziomu analizy.

## Real provider adapters PASS647–651

### PASS647 — Equities live adapter
- quote/candles/corporate actions,
- primary/backup i exchange timezone,
- delayed/live marker bez udawania real time.

### PASS648 — Disclosure/XBRL adapter
- SEC/issuer filing coverage,
- filing timestamp i period semantics,
- brak mieszania filing date z market observation.

### PASS649 — FX bridge
- reference/intraday split,
- bank holiday i market closure semantics,
- osobne confidence caps dla reference i tradable quote.

### PASS650 — Commodities methodology registry
- spot/futures/proxy jawnie rozróżnione,
- contract month i roll policy,
- brak prezentowania ETF proxy jako ceny spot.

### PASS651 — REIT / macro cadence bridge
- market quote vs periodic NAV/macro,
- cadence-aware freshness,
- jawne ograniczenie przy danych kwartalnych.

## Human-grade AI PASS652–656

### PASS652 — Decision-first readout
- najpierw co wiadomo, czego nie wiadomo i co sprawdzić,
- zero marketingowego nadmiaru,
- jednoznaczna granica pewności.

### PASS653 — Claim language sanitizer
- zakaz „pewne”, „gwarantowane”, „bez ryzyka” bez dowodu,
- język zależny od source state,
- PL/DE/EN semantic parity.

### PASS654 — Cross-surface identity ledger
- ten sam instrument, snapshot i claim ID w Browser/Shield/Map/Brain/PDF,
- brak resetu po handoff,
- jawna informacja o zmianie snapshotu.

### PASS655 — Evidence change notification
- użytkownik widzi co zmieniło się od poprzedniego raportu,
- zmiana źródła, timestampu, konfliktu i confidence,
- bez sztucznego FOMO i alarmizmu.

### PASS656 — Human comprehension QA
- krótkie testy zadań i zrozumienia,
- wykrywanie operatorowego żargonu,
- optymalizacja informacji, nie tylko estetyki.

## Shield Map / Brain next generation PASS657–661

### PASS657 — Evidence path minimap
- mała mapa claim → source → conflict → next check,
- bez FPS i technicznego debug HUD-u,
- pełna obsługa klawiatury i touch.

### PASS658 — Brain semantic lobe compression
- priorytet top 5 ścieżek na mobile,
- progressive disclosure pozostałych,
- brak renderowania niewidocznych węzłów.

### PASS659 — Shield Map cross-asset handoff
- dokładna tożsamość z Real Markets,
- zachowanie snapshot/source state,
- brak przypadkowego przejścia do krypto po ticker collision.

### PASS660 — Calm alert choreography
- ruch tylko przy materialnej zmianie dowodu,
- jeden sygnał wizualny zamiast kilku pulsujących alarmów,
- reduced motion i coarse pointer jako pełne warianty produktu.

### PASS661 — Premium systems release
- wspólny UI constitution audit,
- wydajność, accessibility, evidence parity i security proof,
- jedna produkcyjna paczka zastępująca wcześniejsze release’y.
