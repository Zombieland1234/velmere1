# Velmère PASS517–530 — Implementation Report

## Zakres

Pakiet rozwija bazę PASS516 w czternastu kolejnych obszarach: odporność providerów, porównanie źródeł, typografia PDF, lineage sprzeczności AI, drill-down i kapsuły dowodowe Shield Map, ownership gestów, adaptacyjny budżet klatek oraz produkcyjny kontrakt Node 20.

## PASS517 — Provider Failover Runtime

- jawne stany `primary_live / failover_ready / degraded / blocked`,
- failover jest możliwy wyłącznie przy realnym drugim feedzie,
- aktywne i standby źródło oraz confidence cap są widoczne,
- brak danych nie jest maskowany sztucznymi świecami.

## PASS518 — Cross-provider Chart Diff

- porównanie świec po wspólnym timestampie,
- match rate, mediana/maksimum rozbieżności w bps i zgodność kierunku,
- rozróżnienie drugiego feedu świec od samego provider summary,
- jawny tryb `single_source`.

## PASS519 — PDF Typography QA

- wspólny audyt Reader i binarnego PDF,
- kontrola długości zdań, gęstości akapitów, tokenów i uppercase,
- wynik jest częścią Document Health i integrity seal.

## PASS520 — AI Contradiction Lineage

- graf relacji `supports / limits / contradicts`,
- grupowanie źródeł, rynku, płynności, ownership i kontraktu,
- interaktywny wybór węzła i wyjaśnienie relacji,
- brak ukrytych lub losowych relacji.

## PASS521 — Shield Evidence Drill-down

- osobny panel aktywnej osi,
- co wiadomo, czego brakuje, dlaczego to ważne i jaki test wykonać dalej,
- możliwy przyrost confidence i szybkie przejście do powiązanych osi.

## PASS522 — Mobile Gesture QA

- osobne kontrakty dla chart/modal/rail/Shield Map,
- `touch-action` i `overscroll-behavior` mają jawnego właściciela,
- minimum 44 px dla interaktywnych targetów,
- pełny reduced motion.

## PASS523 — Resilient Intelligence Gate

- gate PASS517–522 w głównym buildzie,
- blokada `Math.random()`, sztucznego live i ujemnych iteration count,
- zgodność z PASS480–516.

## PASS524 — Provider Route Truth Ledger

- wykres otrzymał pełny rejestr aktywnej i standby trasy,
- pokazuje stan redundancji, provider consensus i confidence cap,
- następna czynność jest zależna od realnego stanu trasy,
- UI nie utożsamia ciągłości danych z jakością rynku lub rekomendacją.

## PASS525 — AI Lineage Root Cause

- AI wybiera najbardziej obciążony węzeł lineage,
- osobno liczy krawędzie sprzeczności i ograniczeń,
- pokazuje blast radius oraz następny niezależny test,
- root cause jest rankingiem widocznych relacji, a nie wymyśloną przyczynowością.

## PASS526 — PDF Release Scorecard

- jedna bramka łączy Reader Health, page-break QA, typography QA i integrity seal,
- wynik `release / review / blocked` i score 0–100,
- jawne blokery, ostrzeżenia, mocne strony i rekomendacja eksportu,
- status widoczny bezpośrednio w podglądzie A4.

## PASS527 — Adaptive Frame Budget

- VLM i Shield próbkują bieżący frame pacing,
- przy presji klatek ambient WebGL jest ograniczany,
- target FPS przełącza się 60/45/30 bez usuwania informacji o stanie,
- reduced motion pozostaje nadrzędne.

## PASS528 — Shield Evidence Capsule Drawer

- aktywna oś ma rozwijany pakiet trzech kapsuł: sygnał, granica i następny test,
- każda kapsuła ujawnia status i source state,
- drawer działa bez nowego modala i bez blokowania scrolla,
- kapsuły organizują widoczny materiał, nie udają zewnętrznych dokumentów prawnych.

## PASS529 — Mobile Interaction Replay Contract

- VLM pokazuje liczbę aktywnych kontraktów gestów,
- raportuje minimum targetu, target FPS i dropped-frame ratio,
- replay rozdziela page scroll, horizontal rail i lokalne gesty,
- pozostawiono jawną granicę: test urządzeniowy nadal jest wymagany.

## PASS530 — Node 20 Production Contract

- build sprawdza `engines.node = 20.x`,
- kontroluje obecność czterech krytycznych tras,
- pilnuje budżetów rozmiaru pięciu głównych plików źródłowych,
- PASS524–530 są częścią głównego `npm run build`,
- runtime Node 22 w sandboxie generuje ostrzeżenie, nie fałszywy sukces Node 20.

## Walidacja

- wszystkie gate’y PASS480–530: PASS,
- PL / DE / EN: PASS,
- Vercel preflight: PASS — 835 plików,
- parser TypeScript: PASS — 840 TS/TSX,
- ESLint zmienionego obszaru: PASS,
- targetowany semantyczny TypeScript komponentów/API/modułów PASS517–529: PASS,
- production contract Node 20: PASS,
- brak `Math.random()` i sztucznych świec w nowych powierzchniach.

## Granica środowiskowa

Pełny repozytoryjny `tsc --noEmit` i końcowa optymalizacja `next build` nie zostały oznaczone jako zaliczone w sandboxie. Projekt deklaruje Node.js 20.x, natomiast środowisko walidacyjne działało na Node.js 22.16.0. Finalny build należy wykonać na Vercelu lub lokalnie na Node 20.x. Targetowany typecheck nowych powierzchni zakończył się kodem 0.

## Kierunek wzorców

- ruch i reduced motion: Apple Human Interface Guidelines,
- animacje oparte przede wszystkim na `transform` i `opacity`: web.dev,
- gesty chart pan/zoom/crosshair: Lightweight Charts,
- jawny provider state i Protobuf WebSocket: oficjalna dokumentacja MEXC Spot V3.
