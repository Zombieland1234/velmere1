# Velmère Master Build Map — po PASS616

## Status bieżący

PASS612–616 domyka podstawowy kontrakt publicznego Shield terminal: źródła, chart, modal, mobile oraz Basic/Pro/Advanced. Następny odcinek przenosi te same reguły do Real Markets bez przywracania zakładki Krypto.

## Zakończone: Shield terminal PASS612–616

- PASS612 — jeden stan źródła `live / partial / stale / fallback / offline`.
- PASS613 — VisualViewport governor, safe-area, sticky close/tier controls i focus continuity.
- PASS614 — source-bound chart crosshair i publiczny evidence rail.
- PASS615 — dokładnie 10/14/20 unikalnych pól i trwała pamięć tieru.
- PASS616 — mobile stress sweep 320–430 px, landscape, soft keyboard, zoom 200% i reduced motion.

## Następny pakiet: Real Markets PASS617–621

### PASS617 — Non-crypto taxonomy lock
- Real Markets bez zakładki Krypto i bez duplikowania Shield,
- stocks, FX, ETF, commodities, REIT i exchange health jako jedyne publiczne klasy,
- jednoznaczny handoff Crypto → Velmère Shield.

### PASS618 — Full-width adaptive market surface
- desktop bez sztucznego overflow i pustych kolumn,
- mobile jako karty zachowujące źródło, cenę, zmianę, freshness i AI boundary,
- stabilne szerokości oraz skeletony bez layout shift.

### PASS619 — Provider health lineage
- provider, backup, timestamp, freshness, retry i degraded mode przy każdym instrumencie,
- ten sam kontrakt stanu źródła co PASS612,
- zero etykiety live bez timestampu dostawcy.

### PASS620 — Cross-asset chart parity
- stocks, FX, ETF, commodities i REIT z chart evidence overlay,
- pan/pinch/wheel, source-bound crosshair i safe mobile modal,
- brak generowanych losowo świec udających live market.

### PASS621 — Exact market search and identity
- exact ticker/ID/name wygrywa ranking,
- podobne instrumenty pozostają sugestiami i nie otwierają się automatycznie,
- ikona, giełda, waluta i typ aktywa częścią identity lock.

## AI Brain / source intelligence PASS622–626

### PASS622 — Provider capability registry
- jawny zakres danych, limity, TTL, cache, retry i jurysdykcja providera,
- provider nie dostaje claimów spoza swojego zakresu.

### PASS623 — Atomic claim decomposition
- odpowiedź AI rozpada się na atomowe claims,
- każdy claim ma źródło, timestamp, confidence cap i stan konfliktu.

### PASS624 — Deterministic contradiction engine
- konflikty providerów pozostają widoczne,
- reguły rozstrzygnięcia zależą od świeżości, zakresu i jakości, nie od kolejności odpowiedzi.

### PASS625 — Freshness-aware synthesis
- stare dane mogą opisywać historię, ale nie podnoszą pewności bieżącego werdyktu,
- confidence propaguje się od najsłabszej wymaganej warstwy.

### PASS626 — Human next-check planner
- każda luka kończy się jednym konkretnym krokiem,
- priorytet wpływ × koszt × dostępność źródła,
- brak pustych porad typu „sprawdź więcej”.

## Premium UI / motion constitution PASS627–631

### PASS627 — Motion token system
- wspólne czasy, easing, dystanse, stagger i poziomy priorytetu,
- ruch odpowiada zmianie danych lub intencji użytkownika.

### PASS628 — Overlay z-index constitution
- formalna hierarchia header/search/modal/drawer/tooltip/PDF Reader,
- brak nakładania globalnego headera na terminal i PDF.

### PASS629 — Scroll ownership constitution
- dokładnie jedna aktywna warstwa zarządza pionowym scrollem,
- brak background leakage, scroll chaining i podwójnych pasków.

### PASS630 — Perceived-performance geometry shell
- skeleton ma geometrię finalnego komponentu,
- brak skoków chart/modal/cards po załadowaniu źródeł.

### PASS631 — Accessibility and reduced-motion sweep
- widoczny fokus, logiczne nagłówki i pełna obsługa klawiaturą,
- treść zachowana bez animacji i bez zależności od koloru.

## Security / reliability PASS632–636

### PASS632 — Production rate-limit adapter
- server cache, retry-after, throttling i jawny degraded mode,
- brak pętli retry i lawinowych requestów.

### PASS633 — Audit event schema
- trwały zapis komendy, źródeł, modelu, prompt version, decyzji i eksportu,
- prywatny audit bez ujawniania go w publicznym UI.

### PASS634 — Consent and wallet boundary
- brak seed phrase,
- chain/action/value/recipient widoczne przed podpisem,
- anulowanie nie blokuje strony.

### PASS635 — Export redaction policy
- prywatne prompty, wagi, tokeny i identyfikatory nie trafiają do PDF/JSON,
- jawny manifest usuniętych pól.

### PASS636 — Production failure drills
- 429, timeout, offline, partial JSON, zły timestamp, storage failure i provider conflict,
- UI pozostaje używalne i nie podnosi pewności.

## Release proof PASS637–641

### PASS637 — Node 20 clean install gate
- `npm ci` z lockfile w dokładnym środowisku produkcyjnym.

### PASS638 — Full semantic typecheck
- pełny `tsc --noEmit` po instalacji zależności,
- usunięcie prawdziwych błędów zamiast maskowania typów.

### PASS639 — Next production build
- `next build` z zapisanym logiem i bez pomijania krytycznych ostrzeżeń.

### PASS640 — Chromium route matrix
- PL/DE/EN, desktop/mobile, Shield/Map/Brain/PDF/Real Markets,
- keyboard, landscape, reduced motion, zoom i source outages.

### PASS641 — Superseding release capsule
- pełny ZIP, SHA-256, build proof, lista zmian i jeden aktualny master map.

## Rozszerzenie jakości PASS642–646

### PASS642 — PDF/UA external validation lane
- claim zgodności wyłącznie po wyniku dedykowanego walidatora.

### PASS643 — Reader/PDF screenshot diff
- automatyczny diff PL/DE/EN i Basic/Pro/Advanced.

### PASS644 — Source outage replay lab
- deterministyczne replaye missing/stale/fallback/conflict.

### PASS645 — Mobile performance budget
- INP, long tasks, memory, WebGL budget i motion governor per klasa urządzenia.

### PASS646 — Unified evidence release
- wspólna kapsuła Browser + Shield + Map + Brain + Real Markets.

## Dalsza innowacja PASS647–651

### PASS647 — Evidence time travel
- porównanie snapshots bez mieszania starej i bieżącej pewności.

### PASS648 — Claim-to-chart anchoring
- claim otwiera dokładny fragment osi czasu, źródło i candle ID.

### PASS649 — Cross-module case continuity
- Browser → Shield → Map → PDF zachowują identity, tier i source manifest.

### PASS650 — Calm decision cockpit
- jeden publiczny ekran: fakty, konflikty, braki i następny krok bez operatorowego żargonu.

### PASS651 — Velmère production readiness seal
- seal tylko po clean install, typecheck, build, route matrix, outage drills i integralności release.
