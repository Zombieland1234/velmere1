# Velmère Master Build Map — po PASS601

## Status bieżący

PASS597–601 zamyka pakiet Shield Map Replay & Runtime. Następny główny odcinek przenosi te same zasady jakości do VLM Brain, a następnie łączy mózg, PDF, Shield i Real Markets jednym kontraktem źródeł.

## Następny pakiet: VLM Brain PASS602–606

### PASS602 — Neural evidence topology
- stabilne ID każdego płata i agenta,
- jawne wejścia, wyjścia, zależności i konflikty,
- aktywna ścieżka dowodowa zamiast przypadkowego podświetlania,
- brak prywatnych wag w publicznym UI.

### PASS603 — Progressive lobe rendering
- render tylko widocznych płatów,
- budżety GPU normal/constrained/critical,
- offscreen unmount,
- fallback 2D bez utraty treści.

### PASS604 — Confidence propagation
- propagacja limitu pewności od brakującego źródła do werdyktu,
- oddzielenie faktu, hipotezy, konfliktu i missing source,
- wizualny lineage claim → agent → source.

### PASS605 — Brain interaction contract
- klawiatura, touch, mouse i screen reader,
- logiczny roving focus,
- drawer z focus trap i safe-area,
- brak scroll theft i przypadkowych gestów.

### PASS606 — Evidence-driven neural motion
- żadnych nieskończonych dekoracyjnych pętli,
- ruch tylko po aktualizacji danych lub zmianie aktywnego lineage,
- reduced-motion parity,
- telemetryczny budżet klatek bez publicznej diagnostyki operatora.

## PDF / Reader PASS607–611

### PASS607 — Claim-source completeness gate
Każdy mocny claim musi mieć źródło, timestamp, freshness i confidence cap.

### PASS608 — Missing-source appendix
Brak danych ma tworzyć czytelny appendix i next check zamiast pustych lub generycznych sekcji.

### PASS609 — Dynamic A4 density balancing
Compositor ma reagować na realną długość PL/DE/EN i przenosić całe bloki bez nakładania tekstu.

### PASS610 — Reader/download visual parity
Automatyczne porównanie manifestu sekcji, kolejności, źródeł, locale i page count.

### PASS611 — PDF accessibility phase 2
Semantyczna kolejność, prawdziwe nagłówki, link purpose i przygotowanie do StructTreeRoot bez fałszywego claimu PDF/UA.

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
Desktop bez sztucznego 1240 px overflow, mobile jako karty o zachowanej hierarchii danych.

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
AI rozbija odpowiedź na atomowe claims zamiast tworzyć długie, trudne do audytu akapity.

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
Każda warstwa ma jednego właściciela scrolla; brak podwójnego scrolla i background scroll leakage.

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
