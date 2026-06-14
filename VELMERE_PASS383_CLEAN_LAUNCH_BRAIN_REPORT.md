# PASS383 — Clean Launch Brain

## Cel
Naprawa realnego problemu: strona zbierała historyczne panele PASS370-PASS382 i wyglądała jak debug wall. PASS383 włącza czysty launch surface: jedna powierzchnia, jeden VLM Brain, jedno PDF mirror.

## Naprawy
- Ukryto stare publiczne ściany passów w Real Markets / Security / Research Lab przez clean launch CSS, zostawiając markery kompatybilności w kodzie.
- Naprawiono realny syntax poison w `app/api/search/lens-report/route.ts`: `pass381Readout pass382Readout` → `pass381Readout`.
- Dodano PASS383 clean readout do PDF preview/download oraz stronę 16 w PDF.
- Real Markets dostał kolejne instrumenty provider-ready i dopięcie do API catalog.
- VLM AI Brain pokazuje teraz krótki stage flow i jeden readout 10/14/20 pól zamiast historycznych debug-kafelków.

## Granice
Nie udajemy pełnego live dla wszystkich rynków bez providerów. UI jest provider-ready: timestamp, OHLCV, cache age, fallback flag i second source nadal decydują o confidence.
