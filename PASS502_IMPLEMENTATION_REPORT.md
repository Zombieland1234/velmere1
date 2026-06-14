# Velmère PASS496–502 Implementation Report

## Zakres

Pakiet rozwija bazę PASS495 w siedmiu obszarach: adaptacyjna wydajność interfejsu, decyzja AI w 20 sekund, profesjonalniejszy crosshair wykresu, health-check dokumentu A4, stały command dock Shield Map, wspólny premium surface system i release gate.

## PASS496 — Runtime Surface Governor

- wykrywa widoczność karty, reduced motion, reduced transparency, save-data, klasę sprzętu i aktywność użytkownika,
- automatycznie przełącza powierzchnie między `still`, `efficient` i `full`,
- ogranicza WebGL, FPS, blur, orbit, pulse i równoległe pętle animacji,
- zatrzymuje kosztowne renderowanie, gdy karta jest ukryta lub użytkownik jest nieaktywny,
- nie usuwa informacji — redukuje wyłącznie koszt wizualny.

## PASS497 — Neural Decision Brief

- nowa sekcja „decyzja w 20 sekund”,
- osobno pokazuje najmocniejszy fakt, główny limiter i następny test,
- wylicza wpływ każdej osi na końcową pewność,
- kliknięcie osi przenosi fokus do odpowiedniego obszaru topologii,
- Basic / Pro / Advanced zachowują różny zakres, ale wspólną logikę dowodową.

## PASS498 — Chart Insight Runtime

- crosshair pokazuje cenę oraz datę bezpośrednio na wykresie,
- OHLCV uzupełniono o zmianę względem poprzedniej świecy,
- dodano widoczny zakres ceny i impuls wolumenu względem średniej,
- przycisk przejścia do najnowszych danych,
- podwójne kliknięcie resetuje widok,
- nadal obowiązuje polityka: wyłącznie świece źródłowe, bez danych zastępczych.

## PASS499 — A4 Reader Health

- jeden status dokumentu: ready / review / blocked,
- kontrola parytetu preview = download,
- widoczna liczba źródeł, confidence i braków,
- status jest prezentowany w nagłówku podglądu i w Readerze,
- Reader nadal korzysta z tego samego kontraktu czterech stron co binarny PDF.

## PASS500 — Shield Map Command Dock

- stały dock najważniejszych informacji podczas analizy,
- najwyższe ryzyko, najstabilniejsza oś, rozpiętość i liczba osi do sprawdzenia,
- widoczny następny test,
- poprzednia/następna oś dostępna bez przewijania do panelu szczegółowego,
- mobilnie dock wraca do normalnego przepływu, żeby nie zasłaniać treści.

## PASS501 — Premium Surface System

- jeden aktywny fokus zamiast wielu konkurujących animacji,
- paint containment i content visibility dla ciężkich sekcji,
- fallback bez blur przy reduced transparency i słabszych urządzeniach,
- ujednolicone czasy przejść i focus states,
- osobne stany ready / review / blocked dla Reader health.

## PASS502 — Release Gate + Type Repair

- nowy verifier sprawdza wszystkie markery PASS496–502,
- blokuje `Math.random()` w obszarach danych i AI,
- dodany do głównego `npm run build`,
- naprawiono realny problem typu `tone` w PASS493,
- naprawiono zawężanie opcjonalnego `pass488` w walidatorze Lens Report.

## Walidacja

- PASS480–484: PASS
- PASS485–486: PASS
- PASS487: PASS
- PASS488–492: PASS
- PASS493–495: PASS
- PASS496–502: PASS
- PL / DE / EN: PASS
- Vercel preflight: PASS, 812 plików
- parser TypeScript: PASS, 812 plików TS/TSX
- ESLint zmienionego obszaru: PASS
- semantyczny TypeScript zmienionego obszaru i zależności: PASS

## Granica środowiskowa

Pełny `tsc --noEmit` całego repozytorium nie zakończył się w limicie wykonania, ale nie zwrócił diagnostyki błędu. Zmieniony obszar został sprawdzony oddzielnym projektem TypeScript i przeszedł bez błędów. Pełnego `next build` nie uruchamiano ponownie, ponieważ wcześniejsza faza optymalizacji Next.js przekraczała pamięć sandboxa. Repozytorium deklaruje Node.js 20.x.

## Lokalna bramka produkcyjna

```bash
npm ci
npm run verify:pass480-484-chart-identity-terminal-vlm-depth
npm run verify:pass485-486-evidence-brain-pdf-forge
npm run verify:pass487-shield-decision-field
npm run verify:pass488-492-premium-release
npm run verify:pass493-495-premium-attention-reader-map
npm run verify:pass496-502-platform-intelligence
npm run check:i18n
npm run typecheck
npm run vercel:preflight
npm run build
```
