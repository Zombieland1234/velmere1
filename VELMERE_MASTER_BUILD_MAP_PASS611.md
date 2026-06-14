# Velmère Master Build Map — po PASS611

## Status bieżący

PASS607–611 domyka spójność Velmère Browser Reader ↔ pobierany PDF. Claimy są ograniczane przez źródło, timestamp i freshness, luki trafiają do konkretnego aneksu działań, skład A4 reaguje na PL/DE/EN, a endpoint odrzuca rozjazd manifestu. Następny odcinek przenosi jeden wspólny kontrakt źródeł, viewportu i tierów do całego Velmère Shield.

## Zakończone: PDF / Reader PASS607–611

- PASS607 — claim-source completeness gate, timestamp i confidence caps.
- PASS608 — missing-source appendix z wpływem i następnym krokiem.
- PASS609 — dynamiczny skład czterech stron A4 dla PL/DE/EN.
- PASS610 — wspólny manifest Reader/PDF oraz serwerowy mismatch gate.
- PASS611 — semantyczna struktura Reader/PDF bez fałszywego claimu PDF/UA.

## Następny pakiet: Shield terminal PASS612–616

### PASS612 — One source state contract
- jedna definicja `live / partial / stale / fallback / offline`,
- ten sam stan w tabeli, wykresie, modalu, AI i PDF,
- brak sprzecznych etykiet freshness między powierzchniami.

### PASS613 — Modal viewport governor
- dynamiczna wysokość zależna od realnego visual viewport,
- safe-area, klawiatura ekranowa, sticky close/tier controls,
- globalny header nigdy nie przykrywa modala ani wykresu.

### PASS614 — Chart evidence overlay
- crosshair z timestampem i źródłem świecy,
- jawne luki, backup provider i confidence boundary,
- zero technicznego HUD-u operatora w publicznym UI.

### PASS615 — Tier information architecture
- Basic 10, Pro 14, Advanced 20 niepowtarzalnych pól,
- progresywna głębokość zamiast powtórzonej treści,
- stabilny układ desktop/mobile i pamięć wybranego tieru.

### PASS616 — Shield mobile stress sweep
- 320/360/390/430 px, landscape, zoom 200%, soft keyboard,
- touch targets minimum 44 px, focus continuity i jeden właściciel scrolla,
- regresje dla zamknięcia X, backdropu, drawerów i wykresu.

## Real Markets PASS617–621

### PASS617 — Non-crypto taxonomy lock
Real Markets pozostaje bez zakładki Krypto; crypto przechodzi wyłącznie do Shield.

### PASS618 — Full-width adaptive table/cards
Desktop bez sztucznego overflow, mobile jako karty z zachowaną hierarchią danych.

### PASS619 — Provider health lineage
Cena, timestamp, provider, backup, freshness i degradacja w jednym kontrakcie.

### PASS620 — Cross-asset chart parity
Stocks, FX, ETF, commodities i REIT dostają ten sam kontrakt wykresu co Shield.

### PASS621 — Market search exactness
Dokładny ticker/ID/nazwa wygrywa; podobne instrumenty nie otwierają się automatycznie.

## AI Brain / source intelligence PASS622–626

### PASS622 — Source registry
Jawny rejestr providerów, zakresów danych, limitów, cache i retry policy.

### PASS623 — Claim decomposition
Odpowiedź AI rozpada się na atomowe, audytowalne claims.

### PASS624 — Contradiction engine
Konflikty providerów pozostają jawne i mają deterministyczną regułę rozstrzygnięcia.

### PASS625 — Freshness-aware synthesis
Stare dane nie mogą podnosić pewności bieżącego werdyktu.

### PASS626 — Human next-check planner
Każda luka kończy się jednym konkretnym, wykonalnym krokiem kontroli.

## Public UI / premium motion PASS627–631

### PASS627 — Motion token system
Jedne czasy, easing, odległości i priorytety ruchu dla platformy.

### PASS628 — Overlay z-index constitution
Formalny porządek header/search/modal/drawer/tooltip/PDF Reader.

### PASS629 — Scroll ownership constitution
Jedna warstwa jest właścicielem scrolla; brak background leakage i podwójnego scrolla.

### PASS630 — Perceived-performance shell
Skeletony o geometrii finalnego UI bez layout shift.

### PASS631 — Reduced-motion and contrast sweep
Pełna treść bez ruchu, widoczny fokus i kontrast stanów.

## Security / release PASS632–636

### PASS632 — Rate-limit production adapter
Server cache, retry-after, route throttling i czytelny degraded mode.

### PASS633 — Audit event schema
Trwały zapis komendy, źródeł, modelu, prompt version, decyzji i eksportu.

### PASS634 — Consent and wallet boundary
Brak seed phrase; jawne chain/action/value przed podpisem.

### PASS635 — Export redaction policy
Prywatne wagi, prompty i wrażliwe identyfikatory nie trafiają do raportów.

### PASS636 — Production failure drills
Offline provider, 429, timeout, partial JSON, zły timestamp i brak storage nie wywracają UI.

## Release proof PASS637–641

### PASS637 — Node 20 clean install gate
`npm ci` i lockfile w dokładnym środowisku produkcyjnym.

### PASS638 — Full semantic typecheck
Pełne `tsc --noEmit` po instalacji zależności.

### PASS639 — Next production build
`next build` z zapisanym raportem i bez pomijania krytycznych ostrzeżeń.

### PASS640 — Chromium route matrix
PL/DE/EN, desktop/mobile, Shield/Map/Brain/PDF/Real Markets, keyboard i reduced motion.

### PASS641 — Superseding release capsule
ZIP, SHA-256, lista zmian, regresje, build proof i jeden aktualny master map.

## Rozszerzenie po release PASS642–646

### PASS642 — PDF/UA external validation lane
Integracja dedykowanego walidatora; claim zgodności wyłącznie po realnym raporcie.

### PASS643 — Visual parity screenshot diff
Automatyczny diff Reader kontra render PDF dla PL/DE/EN i wszystkich tierów.

### PASS644 — Source outage replay lab
Deterministyczne replaye source missing/stale/conflict bez losowego tekstu AI.

### PASS645 — Premium mobile motion budget
Budżet animacji na klasę urządzenia, INP/long-task gate i reduced-motion parity.

### PASS646 — Unified evidence release
Jedna superseding kapsuła Browser + Shield + Map + Brain + Real Markets.
