# PASS16 World-Class Evaluation Corpus

Ta warstwa zamraża wejścia i kryteria końcowego testu produktu. Nie zawiera deklaracji, że 2 700 odpowiedzi zostało wykonanych.

## Zakres

- 50 przypadków Shield;
- 50 przypadków Real Markets;
- 50 różnych kontraktów Solidity;
- 50 przypadków Lens/PDF;
- 50 przypadków VLM Brain;
- 50 przypadków Angel;
- Basic / Pro / Advanced;
- PL / EN / DE;
- 300 przypadków bazowych × 9 kombinacji = 2 700 canonical outputs.

## Pliki

- `worldclass-base-corpus.json` — 300 wejść i kryteriów;
- `worldclass-2700-matrix.jsonl` — deterministyczna macierz wykonawcza;
- `worldclass-2700-matrix.csv` — wersja do ręcznego audytu;
- `smart-contract-fixture-manifest.json` — SHA-256 50 kontraktów;
- `worldclass-2700-summary.json` — status `PREPARED_NOT_EXECUTED`.

## Zasada wykonania

Nie generować 2 700 wyników po każdej zmianie. Najpierw zamrozić wszystkie sześć adapterów, dane, tier differentiation, tłumaczenia i build. Następnie:

1. jeden pełny przebieg 2 700;
2. scoring automatyczny;
3. poprawa błędów;
4. powtarzanie tylko nieudanych i wysokiego ryzyka podzbiorów;
5. jeden finalny pełny przebieg na finalnym SHA;
6. staging dopiero po offline PASS;
7. LIVE dopiero po staging i niezależnej walidacji.

Historyczny PASS4640 pozostaje dowodem regresyjnym, ale nie spełnia żadnego wiersza PASS16.
