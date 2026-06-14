# PASS596 — build i walidacja

## Wymagane środowisko produkcyjne

- Node.js 20.x
- czyste `npm ci`
- Chromium dostępny przez Playwright lub `CHROMIUM_PATH`

## Zalecana kolejność

```bash
nvm use 20
npm ci
npm run verify:pass592-chromium-fixtures
npm run verify:pass592-596-pdf-chromium-proof-release
npm run verify:pass587-591-chart-identity-continuity-release
npm run verify:pass580-586-pdf-chart-interaction-release
npm run verify:pass573-579-reader-map-search-slo-release
npm run typecheck:pass596
npm run build
```

## Artefakty fixture’ów

Domyślnie runner usuwa PNG/PDF po zapisaniu hashy. Aby zachować pliki:

```bash
PASS592_KEEP_ARTIFACTS=1 \
PASS592_OUTPUT_DIR=./artifacts/pass592 \
npm run verify:pass592-chromium-fixtures
```

## Granica deklaracji

`fixtures/pass592-chromium-render-proof.json` potwierdza realny przebieg Chromium w sandboxie. Przed wdrożeniem produkcyjnym należy wygenerować proof ponownie pod Node.js 20.x. Stan `metadata_only` nie jest równoznaczny z PDF/UA.
