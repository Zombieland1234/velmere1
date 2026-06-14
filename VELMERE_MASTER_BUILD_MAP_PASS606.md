# Velmère Master Build Map — po PASS606

## Status bieżący

PASS602–606 zamyka pakiet VLM Brain Evidence Topology. Mózg ma stabilny graf dowodowy, jawne limity pewności, progressive rendering, fallback 2D, pełny kontrakt interakcji oraz ruch zależny od danych. Następny odcinek przenosi te reguły do PDF/Readera i domyka zgodność podglądu z pobranym dokumentem.

## Zakończone: VLM Brain PASS602–606

- PASS602 — stabilne ID, graf claim/agent/source/verdict, zależności i konflikty.
- PASS603 — budżety normal/constrained/critical, offscreen unmount, fallback 2D.
- PASS604 — confidence propagation, hard caps i źródłowa granica werdyktu.
- PASS605 — ARIA grid, roving focus, focus trap, safe-area i touch parity.
- PASS606 — one-shot evidence motion, reduced-motion parity, brak publicznego HUD-u operatora.

## Następny pakiet: PDF / Reader PASS607–611

### PASS607 — Claim-source completeness gate
- każdy mocny claim wymaga źródła, timestampu, freshness i confidence cap,
- brak pochodzenia blokuje status „potwierdzone”,
- Reader i download używają tego samego manifestu claims.

### PASS608 — Missing-source appendix
- brak danych tworzy konkretny appendix zamiast pustej sekcji,
- każdy brak ma wpływ na pewność i jeden następny krok kontroli,
- brak generycznych placeholderów oraz losowego tekstu AI.

### PASS609 — Dynamic A4 density balancing
- realny pomiar długości PL/DE/EN,
- przenoszenie całych bloków bez nakładania tekstu,
- kontrola widow/orphan, tabel, podpisów i source cards.

### PASS610 — Reader/download visual parity
- wspólny manifest kolejności sekcji, locale, źródeł i page count,
- automatyczna kontrola różnic między podglądem a pobraniem,
- te same nagłówki, wykresy i granice pewności.

### PASS611 — PDF accessibility phase 2
- semantyczna kolejność czytania i prawdziwe nagłówki,
- czytelne link purpose oraz tekst alternatywny wykresów,
- przygotowanie StructTreeRoot bez fałszywego claimu PDF/UA.

## Shield terminal PASS612–616

### PASS612 — One source state contract
Jedna definicja live/partial/stale/fallback/offline we wszystkich kartach, wykresach i PDF.

### PASS613 — Modal viewport governor
Dynamiczna wysokość, safe-area, sticky controls i zero przykrywania przez header.

### PASS614 — Chart evidence overlay
Crosshair, źródło świecy, luka, drugi provider i confidence bez zbędnego HUD-u.

### PASS615 — Tier information architecture
Basic 10, Pro 14, Advanced 20 niepowtarzalnych pól z jasnym wzrostem wartości.

### PASS616 — Shield mobile stress sweep
Małe ekrany, landscape, zoom 200%, klawiatura ekranowa, touch targets i scroll continuity.

## Real Markets PASS617–621

### PASS617 — Non-crypto taxonomy lock
Real Markets pozostaje bez zakładki Krypto; crypto prowadzi wyłącznie do Shield.

### PASS618 — Full-width adaptive table/cards
Desktop bez sztucznego overflow, mobile jako karty o zachowanej hierarchii danych.

### PASS619 — Provider health lineage
Cena, timestamp, provider, backup provider, freshness i status degradacji w jednym kontrakcie.

### PASS620 — Cross-asset chart parity
Stocks, FX, ETF, commodities i REIT dostają ten sam kontrakt interakcji co Shield.

### PASS621 — Market search exactness
Dokładny ticker/ID/nazwa wygrywa; podobne instrumenty nie otwierają się automatycznie.

## AI Brain / source intelligence PASS622–626

### PASS622 — Source registry
Jawny rejestr providerów, zakresu danych, ograniczeń, cache i retry policy.

### PASS623 — Claim decomposition
AI rozbija odpowiedź na atomowe claims zamiast długich, trudnych do audytu akapitów.

### PASS624 — Contradiction engine
Konflikty między providerami pozostają jawne; system nie wybiera wygodniejszej liczby bez reguły.

### PASS625 — Freshness-aware synthesis
Stare dane nie mogą podnosić poziomu pewności bieżącego werdyktu.

### PASS626 — Human next-check planner
Każdy missing source kończy się jednym konkretnym, wykonalnym krokiem kontrolnym.

## Public UI / premium motion PASS627–631

### PASS627 — Motion token system
Jedne czasy, easing, odległości i priorytety ruchu dla całej platformy.

### PASS628 — Overlay z-index constitution
Header, search, modal, drawer, tooltip i PDF Reader mają formalny, testowany porządek warstw.

### PASS629 — Scroll ownership constitution
Każda warstwa ma jednego właściciela scrolla; brak podwójnego scrolla i background leakage.

### PASS630 — Perceived-performance shell
Skeletony o identycznej geometrii finalnego UI, bez skoków layoutu.

### PASS631 — Reduced-motion and contrast sweep
Pełna parytetowa informacja bez ruchu, focus visibility i kontrast stanów.

## Security / release PASS632–636

### PASS632 — Rate-limit production adapter
Server cache, retry-after, per-route throttling i czytelny degraded mode.

### PASS633 — Audit event schema
Trwały zapis komendy, źródeł, modelu, wersji promptu, decyzji i eksportu.

### PASS634 — Consent and wallet boundary
Brak seed phrase, brak ukrytej zgody, jawne chain/action/value przed podpisem.

### PASS635 — Export redaction policy
Prywatne wagi, prompty i wrażliwe identyfikatory nie trafiają do publicznych raportów.

### PASS636 — Production failure drills
Offline provider, 429, timeout, partial JSON, błędny timestamp i brak storage nie mogą wywrócić UI.

## Release proof PASS637–641

### PASS637 — Node 20 clean install gate
`npm ci` i kontrola lockfile w dokładnym środowisku produkcyjnym.

### PASS638 — Full semantic typecheck
Pełne `tsc --noEmit` po instalacji zależności.

### PASS639 — Next production build
`next build` z zapisanym raportem i bez pomijania ostrzeżeń krytycznych.

### PASS640 — Chromium route matrix
PL/DE/EN, desktop/mobile, Shield/Map/Brain/PDF/Real Markets, klawiatura i reduced motion.

### PASS641 — Superseding release capsule
ZIP, SHA-256, lista zmian, regresje, build proof i jeden aktualny master map.
