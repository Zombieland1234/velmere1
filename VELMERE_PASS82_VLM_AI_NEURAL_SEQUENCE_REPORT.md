# PASS 82 — VLM AI Neural Sequence + UX Stability

## Najważniejsze zmiany

- Dodano `VlmAiSequenceOverlay` w `components/market-integrity/TokenRiskModal.tsx`.
- Klik w `AI Bot` / `Basic Analysis` odpala prostą sekwencję: blur UI, glitch text, VLM orb z losowej krawędzi, mały neural tree i spokojne transmittery.
- Klik w `Advanced Analysis`, `Orchestrator` albo `Evidence` odpala mocniejszą sekwencję: więcej węzłów, wielowarstwowe drzewo, szybkie transmittery i po animacji automatycznie otwiera advanced neural console.
- Basic modal zostaje czysty: chart, cena, 24h, volume, risk i krótki opis.
- Advanced pozostaje oddzieloną warstwą premium/gated: VLM core, lanes, AI feed, access panel, liquidity/orderbook i operator workflow.
- Dodano standalone prototyp `VLM_AI_NEURAL_POPUP_INDEX.html`, który działa jako czysty HTML/CSS/JS bez bibliotek.

## Naprawy UX z checklisty

- Search input jest pusty i bez zbędnego placeholdera.
- Suggestions zamykają się po kliknięciu poza search boxem.
- Klik w tabeli otwiera modal local-first, bez wymuszania remote scan, gdy token jest już w tabeli.
- Sortowanie jest dwukierunkowe: drugi klik na nagłówku odwraca kierunek.
- Zakładka `highestRisk` automatycznie ustawia sort po risk malejąco.
- Zakładka `trending` automatycznie ustawia sort po 24h movement malejąco.
- Scroll nad tabelą przekazuje pionowe kółko myszy do strony, więc nie trzeba celować w bok ekranu.
- `FileText` jest importowany w modal component.
- `stress` w SOC orchestrator używa helpera `getWorstStressScenario`, bez `[...stress]` runtime crash.

## Pliki zmienione

- `components/market-integrity/TokenRiskModal.tsx`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `app/globals.css`
- `VLM_AI_NEURAL_POPUP_INDEX.html`
- `VELMERE_PASS82_VLM_AI_NEURAL_SEQUENCE_REPORT.md`

## Weryfikacja

Przeszło:

```bash
npm run verify:shield-all
npm run check:i18n
npm run vercel:preflight
```

Nie uruchomiono pełnego `npm run typecheck`, bo paczka ZIP nie zawiera `node_modules` w sandboxie. Po `npm install` lokalnie można odpalić pełny typecheck/build.
