# Velmère PASS592–596 — Chromium PDF proof, source navigation and typography release

Data: 2026-06-08  
Baza: PASS591  
Wydanie: PASS596

## Wynik wykonawczy

Ten pakiet zamyka najważniejszy brak w warstwie Lens/PDF: raport nie jest już oceniany wyłącznie przez kontrakty i parser. Dwadzieścia siedem wariantów PL/DE/EN × Basic/Pro/Advanced × short/normal/overloaded zostało rzeczywiście wyrenderowanych w Chromium do PNG i PDF. Każdy wariant dał dokładnie cztery strony A4, a dla obu artefaktów zapisano SHA-256.

Reader oraz pobrany PDF otrzymały wspólną, dwukierunkową mapę roszczeń i źródeł. Długie portfele, identyfikatory, URL-e i niemieckie złożenia mają deterministyczne miejsca łamania, dzięki czemu nie poszerzają komórek ani nie wchodzą na stopkę.

## PASS592 — realny Chromium visual fixture runner

- Dodano plan i receipt dla wszystkich 27 fixture’ów z PASS580.
- Dodano produkcyjny runner Playwright korzystający z jednego procesu Chromium zamiast uruchamiania osobnej przeglądarki dla każdego PNG i PDF.
- Runner sprawdza obecność czterech stron w DOM, renderuje pełny screenshot, drukuje PDF i zapisuje SHA-256.
- Proof JSON zawiera wersję Chromium, wersję Node, viewport, liczbę stron, hashe oraz granicę wykonania.
- W sandboxie wykonano niezależny przebieg Chromium DevTools Protocol: 27/27 fixture’ów, po 4 strony każdy.

Główne pliki:
- `lib/market-integrity/pass592-chromium-visual-fixture-runner.ts`
- `scripts/run-pass592-chromium-pdf-fixtures.mjs`
- `fixtures/pass592-chromium-render-proof.json`

## PASS593 — uczciwy gate tagged PDF

- PDF jest sprawdzany pod kątem `/Lang`, `/Title`, linków, `StructTreeRoot`, `MarkInfo`, `RoleMap` i dowodu kolejności czytania.
- Aktualny generator jest świadomie oznaczony jako `metadata_only`, a nie jako PDF/UA.
- System może użyć określenia `tagged_candidate` dopiero po znalezieniu wszystkich markerów strukturalnych.
- Endpoint nie udaje zgodności dostępności, której binarnie nie potwierdzono.

Główny plik:
- `lib/market-integrity/pass593-tagged-pdf-feasibility-gate.ts`

## PASS594 — dwukierunkowe przypisy źródłowe

- Każde pole wybranego poziomu dostaje stabilny identyfikator `C01`, `C02` itd.
- Roszczenie w Readerze prowadzi do `S01`, `S02` itd., a źródło posiada link powrotny do powiązanego roszczenia.
- Pobierany PDF otrzymuje prawdziwe adnotacje `/Subtype /Link`, nie tylko nieklikalny tekst.
- Endpoint blokuje odpowiedź błędem `pdf_footnote_link_mismatch`, jeżeli raport deklaruje przypisy, ale binarny PDF nie zawiera linków.
- Mapa przypisów posiada własny checksum `VLM-FOOTNOTE-*`.

Główny plik:
- `lib/market-integrity/pass594-bidirectional-source-footnotes.ts`

## PASS595 — odporność typografii ekstremalnej

- Dodano klasyfikację: wallet, URL, identifier, German compound i long token.
- URL-e są najpierw dzielone przy separatorach, a portfele i identyfikatory w stałych, przewidywalnych segmentach.
- Ten sam preprocesor działa przed dotychczasowym łamaczem PDF.
- Reader otrzymał `overflow-wrap:anywhere`, `word-break:break-word` i `hyphens:auto` w powierzchniach dowodowych.
- Linki przypisów mają właściwy focus, scroll margin, 44 px minimum na telefonie i wariant reduced-motion.

Główny plik:
- `lib/market-integrity/pass595-extreme-typography-hardening.ts`

## PASS596 — kapsuła dowodu wydania PDF

- Raport wiąże w jeden klucz:
  - fixture Chromium,
  - receipt źródeł,
  - parity Reader/download,
  - wynik compositora,
  - checksum przypisów,
  - stan typografii,
  - faktyczny stan tagged-PDF.
- Reader pokazuje jedynie mały badge `Proof`, bez publicznego panelu diagnostyki operatora.
- Endpoint zwraca identyfikator kapsuły w `x-velmere-pdf-proof-capsule`.
- Kapsuła może być sealed przy `metadata_only`; nie zmienia to stanu w fałszywe twierdzenie o PDF/UA.

Główny plik:
- `lib/market-integrity/pass596-pdf-release-proof-capsule.ts`

## Integracja UI i API

- `lib/search/lens-report.ts` buduje kontrakty PASS592–596 dla dokładnie wybranego poziomu 10/14/20.
- `VelmereIntelligenceSearchClient.tsx` posiada stabilne kotwice roszczeń i źródeł, linki powrotne oraz zwarte oznaczenie proof.
- `app/api/search/lens-report/route.ts` używa typografii PASS595, generuje PDF link annotations i weryfikuje wynikowy bufor.
- `app/globals.css` utwardza zawijanie tekstu, fokus, safe touch targets i reduced motion.

## Walidacja wykonana

- Realny Chromium CDP: **27/27 fixture’ów PASS**, każdy PDF ma dokładnie 4 strony.
- PASS592–596 dedicated gate: **PASS**.
- Bezpośredni smoke endpointu PDF: **HTTP 200, 4 strony, 22 adnotacje Link, `/Lang` obecny, stan `metadata_only`**.
- PASS587–591 regression gate: **PASS**.
- PASS580–586 regression gate: **PASS**.
- PASS573–579 regression gate: **PASS**.
- i18n PL/DE/EN: **PASS**.
- Vercel preflight: **PASS — 872 pliki**.
- Parser TypeScript: **PASS — 868 plików TS/TSX, 0 błędów składni**.
- Strict semantic TypeScript dla czystych modułów PDF PASS580–584 i PASS592–596: **PASS**.
- Integralność proof JSON: **PASS**, agregat SHA-256 obecny.

## Jawne ograniczenia

- Przebieg proof w sandboxie użył zainstalowanego Node.js 22.16.0 do orkiestracji Chromium. Produkcyjny kontrakt nadal wymaga ponownego uruchomienia dostarczonego runnera pod Node.js 20.x.
- Pełny `next build` nie został wykonany, ponieważ przekazany projekt nie zawiera `node_modules`.
- Pełny semantyczny typecheck UI/API bez `npm ci` zgłasza brak typów Next/React/Node; czyste moduły nowego pakietu przeszły strict typecheck.
- PDF ma język, tytuł, selekcjonowalny tekst i linki, ale nie posiada jeszcze kompletnego drzewa struktury. Nie jest deklarowany jako PDF/UA.

## Produkcyjna walidacja

```bash
nvm use 20
npm ci
npm run verify:pass592-chromium-fixtures
npm run verify:pass592-596-pdf-chromium-proof-release
npm run typecheck:pass596
npm run build
```
