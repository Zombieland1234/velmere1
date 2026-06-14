# Velmère PASS503–509 Implementation Report

## Zakres

Pakiet rozwija bazę PASS502 w siedmiu obszarach: jawny stan providerów, pamięć widoku wykresu, QA stron PDF, source-diff timeline AI, porównanie scenariuszy Shield Map, mobilny replay analizy oraz release gate.

## PASS503 — Provider State Runtime

- wspólny stan `live / stale / partial / offline`,
- kontrola wieku ostatniej świecy względem interwału,
- rzeczywista kadencja obliczana z mediany odstępów,
- pokrycie historii bez generowania zastępczych świec,
- widoczny status providera bezpośrednio w pasku wykresu.

## PASS504 — Chart View Cache

- zapamiętywanie zoomu i przesunięcia per symbol + interwał,
- cache wyłącznie w `sessionStorage`,
- automatyczne wygasanie po 12 godzinach,
- bezpieczny fallback, gdy storage jest wyłączony,
- powrót do wykresu nie resetuje kontekstu użytkownika.

## PASS505 — PDF Page-Break QA

- kontrola zgodności liczby stron Reader / binary PDF,
- estymacja gęstości treści dla każdej z czterech stron,
- status `ready / review` per strona,
- widoczne QA stron A4 w Readerze,
- wymuszone łamanie stron w trybie print.

## PASS506 — AI Source-Diff Timeline

- dowody są układane w kolejności: brak → review → potwierdzenie,
- jawny wpływ każdego kroku: supports / limits / blocks,
- maksymalnie osiem najważniejszych zmian zamiast ściany danych,
- brak źródła nigdy nie jest zastępowany przewidywaniem,
- osobny licznik verified / review / missing.

## PASS507 — Shield Scenario Comparator

- trzy scenariusze: baseline, pressure, after verification,
- rozpiętość ryzyka i delta confidence,
- symulacja jest jawnie oznaczona jako kontrola dowodów, nie prognoza ceny,
- interaktywne karty scenariuszy,
- animacja respektuje reduced motion.

## PASS508 — Mobile Reasoning Replay

- kompaktowy replay do sześciu kroków,
- poprzedni / następny krok,
- poziomy scroll-snap na telefonie,
- aktywny krok ma jednoznaczny fokus,
- zachowana dostępność klawiatury i aria-pressed.

## PASS509 — Release Gate

- nowy verifier dodany do głównego `npm run build`,
- blokada `Math.random()` na krytycznych powierzchniach danych,
- blokada języka sugerującego sztuczne dane live,
- kontrola markerów wszystkich powierzchni PASS503–508,
- naprawione dwa realne błędy TypeScript znalezione przez targetowany typecheck.

## Walidacja

- PASS480–502: PASS,
- PASS503–509: PASS,
- PL / DE / EN: PASS,
- Vercel preflight: PASS, 818 plików,
- parser TypeScript: PASS, 814 TS/TSX,
- ESLint zmienionego obszaru: PASS,
- semantyczny TypeScript zmienionego obszaru i zależności: PASS.

## Granica środowiskowa

Repozytorium deklaruje Node.js 20.x. Sandbox używał Node.js 22.16.0. Pełny repozytoryjny `tsc --noEmit` przekroczył limit pojedynczego wywołania bez diagnostyki; targetowany projekt TypeScript obejmujący wszystkie zmienione powierzchnie i ich zależności przeszedł bez błędów.
