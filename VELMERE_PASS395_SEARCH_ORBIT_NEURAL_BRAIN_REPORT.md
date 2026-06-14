# PASS395 · Search Runtime Lock + Orbit 360 Neural Brain

## Cel
Zamknąć bugi wyszukiwarek w Velmère Browser, Shield, Shield Map i Real Markets oraz wdrożyć jeden wspólny kontrakt VLM AI Brain / Orbit 360 dla Basic, Pro i Advanced.

## Zmiany
- Dodano `lib/market-integrity/pass395-neural-orbit-search-contract.ts` jako wspólny kontrakt search runtime + Orbit 360 Neural Brain.
- Velmère Browser: zamyka sugestie przed search, PDF forge, preview, close i download; preview/download oznaczone jako ten sam resolved report object.
- Velmère Shield: wyszukiwarka czyści panel i frame przy modal open, submit, outside click, escape i clear.
- Shield Map: panel sugestii nie używa fallbackowych współrzędnych i nie renderuje się bez prawdziwego frame inputa.
- Real Markets: search zamyka się przy tab switch, row open, modal open i suggestion select; dodano panel VLM coin + blue neural brain + 10/14/20 output fields.
- TokenRiskModal: Basic/Pro/Advanced dostał wizualny VLM neural collector z niebieskimi neuronami i timerem zbierania informacji.
- CSS: dodano lightweight orbit/neuron animation, field grid, reduced motion fallback.

## Walidacja
- `npm run verify:pass395-search-orbit-neural-brain` ✅
- `npm run verify:pass394-build-runtime-cleanup` ✅
- `npm run verify:pass393-build-key-syntax-hotfix` ✅
- `npm run verify:pass392-public-fidelity-core` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅

## Uwaga techniczna
PASS395 skanuje 690 plików TS/TSX parserem TypeScript. Pełny typecheck/build w eksporcie nadal zależy od lokalnego `node_modules` i kompletu typów Next/React/Node/providerów.
