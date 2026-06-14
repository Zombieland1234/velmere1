# Velmère Master Build Map — stan po PASS626

## Aktualny stan

PASS602–606 ustabilizował topologię VLM Brain. PASS607–611 ujednolicił Reader/PDF. PASS612–616 przeniósł wspólny source state i mobile governor do Shield. PASS617–621 domknął Real Markets bez krypto. PASS622–626 dodał centralny registry, atomowe claimy, jawne konflikty providerów, freshness-aware synthesis i konkretny planner kontroli.

## Zakończone: AI Brain / source intelligence PASS622–626

- PASS622 — source registry: provider, asset class, internal route, TTL, retry, rate limit, cache i failover.
- PASS623 — atomic claim decomposition z trwałymi ID i rozdzieleniem fakt/hipoteza/granica.
- PASS624 — provider contradiction engine z progami zależnymi od klasy aktywa.
- PASS625 — synteza current / last-known / unverified bez podbijania pewności starymi danymi.
- PASS626 — planner następnej kontroli według wpływu, kosztu i dostępności źródła.

## Następny pakiet: Public UI / premium motion PASS627–631

### PASS627 — Motion token constitution
- jeden zestaw duration, easing, spring, distance i priority dla Browser, Shield, Map, Brain i Real Markets,
- ruch wynika ze zmiany stanu, nie z nieskończonego dekoracyjnego loopa,
- osobny budżet dla mobile, coarse pointer i reduced motion.

### PASS628 — Overlay z-index constitution
- formalny porządek header/search/listbox/modal/drawer/chart tooltip/PDF Reader,
- usunięcie lokalnych `z-[999999]`,
- test nakładania safe-area, sticky headera i portali.

### PASS629 — Scroll ownership constitution
- tylko jedna aktywna warstwa posiada scroll,
- zero background leakage, nested wheel traps i podwójnych scrollbarów,
- restore pozycji po zamknięciu modala/drawera.

### PASS630 — Perceived-performance shell
- skeleton ma geometrię finalnego UI,
- provider pending → partial → live bez layout shift,
- stabilne wysokości tabel, kart, wykresów i Reader pages.

### PASS631 — Reduced-motion / focus / contrast sweep
- pełna funkcjonalność bez animacji,
- widoczny focus i logiczna kolejność klawiatury,
- kontrast source states, badges, tooltipów i disabled controls.

## Security / runtime PASS632–636

### PASS632 — Production rate-limit adapter
Trwały server cache, `Retry-After`, per-route throttling i czytelny degraded mode.

### PASS633 — Audit event schema
Trwały zapis requestu, źródeł, wersji modelu, prompt version, decyzji, eksportu i redakcji.

### PASS634 — Consent and wallet boundary
Jawne chain/action/value przed podpisem; nigdy seed phrase ani prywatny klucz.

### PASS635 — Export redaction policy
Prompty, wagi, sekrety, tokeny i wrażliwe identyfikatory nie trafiają do PDF ani publicznych receiptów.

### PASS636 — Production failure drills
Offline provider, timeout, 429, malformed JSON, zły timestamp, brak storage i partial payload nie wywracają UI.

## Release proof PASS637–641

### PASS637 — Node 20 clean install gate
`npm ci` na czystym środowisku zgodnym z produkcją.

### PASS638 — Full semantic typecheck
Pełne `tsc --noEmit` po instalacji zależności.

### PASS639 — Next production build
`next build` z raportem tras, rozmiarem bundle i krytycznymi ostrzeżeniami.

### PASS640 — Chromium route matrix
PL/DE/EN, desktop/mobile, Browser/Shield/Map/Brain/PDF/Real Markets, keyboard i reduced motion.

### PASS641 — Superseding release capsule
Jedna aktualna paczka ZIP, SHA-256, lista zmian, build proof i master map.

## Rozszerzenie jakości PASS642–646

- PASS642 — PDF/UA external validation lane.
- PASS643 — Reader/PDF screenshot parity PL/DE/EN × Basic/Pro/Advanced.
- PASS644 — source outage replay lab: missing/stale/conflict/partial.
- PASS645 — premium mobile motion budget: INP/long tasks/GPU.
- PASS646 — unified evidence release Browser + Shield + Map + Brain + Real Markets.

## Real provider adapters PASS647–651

- PASS647 — equities quote/candles/corporate actions adapter.
- PASS648 — SEC/issuer disclosure i XBRL coverage adapter.
- PASS649 — FX reference/intraday bridge z osobnymi confidence caps.
- PASS650 — commodity spot/futures/proxy method registry.
- PASS651 — REIT/macro cadence bridge.

## Human-grade AI delivery PASS652–656

- PASS652 — decision-first readout.
- PASS653 — claim language sanitizer.
- PASS654 — cross-surface identity ledger.
- PASS655 — evidence change notification.
- PASS656 — human comprehension QA.
