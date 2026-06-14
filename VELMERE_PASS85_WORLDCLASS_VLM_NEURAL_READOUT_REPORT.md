# Velmère PASS 85 — Worldclass VLM Neural Readout Animation

## Cel
PASS 85 kontynuuje kierunek z PASS 84: analiza tokena nie jest czatem ani tabelą. Po kliknięciu Basic/Advanced VLM ma czytać token przez kulę, linie, transmittery i karty danych wyłaniające się po kolei.

## Zmienione pliki
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`

## Najważniejsze zmiany
- Ulepszono pełnoekranowy VLM readout overlay.
- Basic ma 10 punktów danych rozmieszczonych po ekranie.
- Advanced ma 20 punktów danych rozmieszczonych w logicznych railach: lewa strona, prawa strona, górny pasek i dolny pasek.
- Połączenia z centrum VLM są teraz organicznymi krzywymi SVG, nie zwykłymi prostymi liniami.
- Każda linia rysuje się po kolei.
- Karta danych pokazuje się dopiero po dojściu linii do punktu końcowego.
- Dodano transmittery danych lecące po każdej linii przez `animateMotion`.
- Advanced generuje więcej transmitterów na każdej linii i szybszy ruch.
- Dodano endpoint pulse po dotarciu linii.
- Dodano skan świetlny na karcie przy reveal.
- Dodano tło typu cinematic neural field: powolny conic sweep, drobne punkty/starfield, lepszy glow.
- Zachowano brak czatu i brak starego `Current Signal`.
- Zachowano brak czerwonego labela ceny na świeczkach w compact chart.

## Walidacja wykonana w sandboxie
Przeszło:
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

`npm run typecheck` uruchomiono, ale sandbox nie ma `node_modules`, więc TypeScript pokazuje brak typów dla Next/React/Lucide/next-intl itd. To jest ograniczenie środowiska ZIP bez zależności, nie błąd składni PASS 85.
