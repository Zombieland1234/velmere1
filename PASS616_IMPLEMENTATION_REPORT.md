# Velmère PASS612–616 — Shield Terminal Source & Mobile Release

## Cel wydania

PASS612–616 porządkuje najważniejszy publiczny przepływ Velmère Shield: źródło → wykres → modal → poziom analizy → VLM Brain. Każda powierzchnia korzysta teraz z tego samego słownika stanu źródła, modal reaguje na rzeczywisty visual viewport telefonu, wykres pokazuje dowód przypięty do świecy, a Basic/Pro/Advanced mają dokładnie 10/14/20 unikalnych pól zamiast powtarzanej treści.

## PASS612 — One source state contract

- Dodany wspólny kontrakt `live / partial / stale / fallback / offline`.
- Warstwy market, candles, orderbook, holders, contract i OSINT niosą provider, backup, observedAt, rodzaj timestampu, coverage, freshness budget i confidence cap.
- Timestamp trasy/API nie może podnieść danych do `live`; tylko timestamp providera lub jawny statyczny identyfikator może potwierdzić świeżość.
- Opcjonalny brak OSINT/holderów nie degraduje bazowego wyniku market+chart, ale pozostaje widoczny jako luka w wyższych tierach.
- Ten sam stan zasila publiczny evidence spine, wykres, pola VLM Brain i limit pewności.

## PASS613 — Modal visual viewport governor

- Modal reaguje na `window.visualViewport` przy resize, scroll, zoom i pojawieniu się klawiatury ekranowej.
- Dynamiczne zmienne CSS sterują wysokością, offsetem, safe-area i maksymalną wysokością dialogu.
- Globalny header nie może już przykryć modala; modal jest pozycjonowany względem realnego viewportu wizualnego.
- Header oraz szybki wybór tieru są sticky, a pionowy scroll należy wyłącznie do `dialog_shell`.
- Focus jest przenoszony na X po otwarciu, pozostaje w dialogu i wraca do elementu otwierającego po zamknięciu.
- Escape zamyka aktywną sekwencję VLM albo cały modal.

## PASS614 — Chart evidence overlay

- Wykres ma publiczny evidence rail bez FPS, drop-rate i operator HUD-u.
- Rail pokazuje stan źródła, provider, backup, timestamp, confidence cap i liczbę luk.
- Crosshair świec pokazuje czas wybranej świecy oraz przypięty stan dowodu.
- Timestampy sekundowe i milisekundowe są normalizowane przed prezentacją.
- Fallback/sparkline nie udaje świeżych świec providera.
- Evidence overlay działa dla candlestick i line fallback.

## PASS615 — Tier information architecture

- Basic: dokładnie 10 unikalnych pól.
- Pro: dokładnie 14 pól, czyli Basic + cztery nowe wymiary.
- Advanced: dokładnie 20 pól, czyli Pro + sześć kolejnych wymiarów.
- Każde pole ma stan `confirmed / limited / missing` powiązany z konkretną warstwą źródłową.
- Wybrany tier jest zapisywany w `localStorage` pod stabilnym kluczem `velmere:shield-analysis-tier:v1`.
- Desktopowe karty oraz mobilny quick dock pokazują field budget i liczbę braków.
- VLM Brain dostaje wyłącznie pola aktywnego tieru, więc głębokość analizy jest rzeczywista, nie kosmetyczna.

## PASS616 — Mobile stress sweep

- Dodany deterministyczny kontrakt dla 320/360/390/430 px, landscape, soft keyboard i zoomu 200%.
- Minimalny produktowy touch target wynosi 44 px.
- Sprawdzane są: focus continuity, sticky X, jeden właściciel scrolla, backdrop close, miejsce nad klawiaturą, reflow przy zoomie i orientacja.
- CSS zawiera osobne reguły dla 360 px, landscape low-height, safe-area oraz `prefers-reduced-motion`.
- Mobilny chart evidence rail przechodzi na dwie kolumny i ukrywa najmniej ważny backup przy ekstremalnie wąskim ekranie.

## Zmienione powierzchnie

- `lib/market-integrity/pass612-one-source-state-contract.ts`
- `lib/market-integrity/pass613-modal-viewport-governor.ts`
- `lib/market-integrity/pass614-chart-evidence-overlay.ts`
- `lib/market-integrity/pass615-tier-information-architecture.ts`
- `lib/market-integrity/pass616-shield-mobile-stress-sweep.ts`
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`
- `scripts/verify-pass612-616-shield-terminal-release.mjs`
- `tsconfig.pass616.json`
- `package.json`

## Walidacja

- PASS592–596 verifier: PASS
- PASS597–601 verifier: PASS
- PASS602–606 verifier: PASS
- PASS607–611 verifier: PASS
- PASS612–616 verifier: PASS
- Strict TypeScript nowych modułów PASS612–616: PASS
- i18n PL/DE/EN: PASS
- Vercel preflight: PASS — 892 pliki
- Parser całego projektu: 899 plików TS/TSX, 0 błędów składni
- Parser CSS PostCSS: PASS
- Runtime matrix: 320/360/390/430 px, landscape i zoom 200%: PASS
- Integralność ZIP i SHA-256: wykonywane przy kapsule release

## Uczciwa granica walidacji

Pełny `next build`, pełny semantyczny typecheck React/Next oraz ESLint nie są deklarowane jako wykonane. W odizolowanej kopii podjęto próbę czystego `npm ci`, lecz środowisko przerwało proces sygnałem `SIGTERM` przed ukończeniem, a używany Node.js 22.16.0 nie spełnia deklarowanego przez projekt zakresu Node.js 20.x. Niekompletne `node_modules` nie weszło do release. Pięć nowych czystych kontraktów przeszło własny ścisły `tsc`, wszystkie pliki TS/TSX przeszły parser, a gate regresji poprzednich pakietów pozostał zielony.
