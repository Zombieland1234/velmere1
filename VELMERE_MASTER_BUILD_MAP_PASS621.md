# Velmère Master Build Map — stan po PASS621

## Aktualny stan

PASS602–606 ustabilizował topologię dowodową VLM Brain, PASS607–611 ujednolicił Reader/PDF, PASS612–616 przeniósł jeden kontrakt źródeł i viewportu do Shield, a PASS617–621 domknął publiczne Real Markets bez krypto, z provider lineage, pełną responsywnością, chart parity i exact-only search.

## Zakończone: Real Markets PASS617–621

- PASS617 — publiczny taxonomy lock bez crypto/token/stablecoin.
- PASS618 — pełna tabela 1024+ i adaptacyjne karty poniżej.
- PASS619 — jeden provider lineage w tabeli, kartach, modalu i wykresie.
- PASS620 — chart parity zależne od source-bound candles.
- PASS621 — exact-only auto-open oraz jawny wybór podobnych instrumentów.

## Następny pakiet: AI Brain / source intelligence PASS622–626

### PASS622 — Source registry
- kanoniczny rejestr providerów, endpointów, klas aktywów i wymaganych kluczy,
- TTL, retry, rate limit, cache i backup provider w jednym kontrakcie,
- publiczny UI widzi stan źródła, nie wewnętrzne sekrety ani prompty.

### PASS623 — Atomic claim decomposition
- odpowiedź AI rozpada się na atomowe claims z trwałym ID,
- każdy claim ma source IDs, timestamp, status i confidence cap,
- brak zbiorczych akapitów mieszających fakty, hipotezy i rekomendacje kontroli.

### PASS624 — Provider contradiction engine
- deterministyczne wykrywanie różnic ceny, timestampu, fundamentals i filingów,
- konflikt pozostaje widoczny zamiast wybierania wygodniejszego źródła,
- reguła rozstrzygnięcia zależna od klasy aktywa i świeżości.

### PASS625 — Freshness-aware synthesis
- stare dane nie mogą zwiększać pewności bieżącego werdyktu,
- osobne budżety świeżości dla FX reference, equities, commodities, REIT i venue health,
- AI rozdziela „ostatni znany fakt” od „bieżącego stanu niepotwierdzonego”.

### PASS626 — Human next-check planner
- każda luka kończy się jednym konkretnym krokiem weryfikacji,
- priorytety według wpływu na decyzję, kosztu i dostępności źródła,
- brak generycznych „sprawdź więcej danych”.

## Public UI / premium motion PASS627–631

### PASS627 — Motion token constitution
Jedne czasy, easing, dystanse, springi i priorytety ruchu dla Browser, Shield, Map, Brain i Real Markets.

### PASS628 — Overlay z-index constitution
Formalny porządek header/search/listbox/modal/drawer/chart tooltip/PDF Reader bez lokalnych milionowych z-indexów.

### PASS629 — Scroll ownership constitution
Jedna aktywna warstwa posiada scroll; zero background leakage, nested wheel traps i podwójnych scrollbarów.

### PASS630 — Perceived-performance shell
Skeletony mają geometrię finalnego UI, brak layout shift i spokojne przejście provider pending → data.

### PASS631 — Reduced-motion / focus / contrast sweep
Pełna funkcjonalność bez animacji, widoczny fokus i kontrast wszystkich source states.

## Security / runtime PASS632–636

### PASS632 — Production rate-limit adapter
Trwały server cache, retry-after, per-route throttling i czytelny degraded mode.

### PASS633 — Audit event schema
Trwały zapis requestu, źródeł, wersji modelu, prompt version, decyzji, eksportu i redakcji.

### PASS634 — Consent and wallet boundary
Jawne chain/action/value przed podpisem; nigdy seed phrase ani prywatny klucz.

### PASS635 — Export redaction policy
Wewnętrzne prompty, wagi, sekrety, tokeny i wrażliwe identyfikatory nie trafiają do PDF ani publicznych receiptów.

### PASS636 — Production failure drills
Offline provider, timeout, 429, malformed JSON, zły timestamp, brak storage i partial payload nie wywracają UI.

## Release proof PASS637–641

### PASS637 — Node 20 clean install gate
`npm ci` na czystym środowisku zgodnym z produkcją.

### PASS638 — Full semantic typecheck
Pełne `tsc --noEmit` po instalacji zależności.

### PASS639 — Next production build
`next build` z zapisanym raportem, rozmiarem tras i krytycznymi ostrzeżeniami.

### PASS640 — Chromium route matrix
PL/DE/EN, desktop/mobile, Browser/Shield/Map/Brain/PDF/Real Markets, keyboard i reduced motion.

### PASS641 — Superseding release capsule
Jedna aktualna paczka ZIP, SHA-256, lista zmian, build proof i master map.

## Rozszerzenie jakości PASS642–646

### PASS642 — PDF/UA external validation lane
Zewnętrzny walidator i claim zgodności wyłącznie po realnym raporcie.

### PASS643 — Reader/PDF screenshot parity
Automatyczny diff PL/DE/EN × Basic/Pro/Advanced.

### PASS644 — Source outage replay lab
Deterministyczne replaye missing/stale/conflict/partial bez losowej narracji AI.

### PASS645 — Premium mobile motion budget
Budżet INP/long tasks/GPU na klasę urządzenia oraz parity reduced-motion.

### PASS646 — Unified evidence release
Jedna kapsuła Browser + Shield + Map + Brain + Real Markets.

## Dalsze rozszerzenie PASS647–651 — real provider adapters

### PASS647 — Equities provider adapter
Quote/candles/corporate actions z provider timestamp, cache i backupem.

### PASS648 — SEC/issuer disclosure adapter
Filing cadence, XBRL concepts, issuer events i jawne coverage gaps.

### PASS649 — FX reference/intraday bridge
Reference rate i intraday pozostają osobnymi metodami z oddzielnym confidence cap.

### PASS650 — Commodity method registry
Spot/futures/proxy mają jawny typ kontraktu, expiry i metodologię.

### PASS651 — REIT/macro cadence bridge
ETF/REIT price nie jest mieszany z miesięcznym lub kwartalnym makro.

## Dalsze rozszerzenie PASS652–656 — human-grade AI delivery

### PASS652 — Decision-first readout
Najpierw stan i granica pewności, potem dowody, na końcu szczegóły techniczne.

### PASS653 — Claim language sanitizer
Zakaz obietnic, fałszywej pewności, presji i nieudowodnionych superlatywów.

### PASS654 — Cross-surface identity ledger
Ten sam asset/source/claim ID przechodzi Browser → Shield → Map → Brain → PDF.

### PASS655 — Evidence change notification
Użytkownik widzi, co realnie zmieniło się od poprzedniego snapshotu.

### PASS656 — Human comprehension QA
Testy czy użytkownik rozumie źródło, świeżość, konflikt, lukę i następny krok bez diagnostyki operatora.
