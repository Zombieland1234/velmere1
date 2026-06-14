# PASS381 — Live Provider Orchestrator

## Zakres
PASS381 scala Real Markets, VLM Shield, Velmère Browser PDF, Security i Research Lab w jeden provider-orchestrated VLM Brain.

## Implementacja
- Dodano `lib/market-integrity/pass381-live-provider_orchestrated_brain.ts`.
- Rozszerzono katalog Real Markets o kolejne provider-ready instrumenty: banki, fintech, semiconductor/AI, energy, FX, ETF, commodities i real-estate proxies.
- Dopięto Real Markets API `/api/market-integrity/real-markets/catalog` do PASS381.
- Dodano VLM Brain readout PASS381: Basic = 10 pól, Pro = 14 pól, Advanced = 20 pól.
- Dodano PDF page 15: `PASS381 ORCHESTRATED AI MIRROR`.
- Dodano HTML preview section `pass381-orchestrated-ai-mirror`, aby Browser preview i pobrany PDF szły jednym resolved report object.
- Dodano prostszą sekcję Security: private key stays private, signature proof, provider truth, entropy quality, redacted proof, research boundary.
- Dodano Research Lab room: banki → ECC/BTC → real RNG → liczby pierwsze → Bajak Protocol jako audyt/falsyfikacja/replikacja.

## Granice bezpieczeństwa i prawdy
- Brak fake-live: katalog instrumentów nie oznacza świeżej ceny.
- Live status wymaga timestamp, cache age, OHLCV, provider id, fallback flag i second-source/reference lane.
- PDF nie ma drugiego generatora copy: preview/modal/download mają dzielić jeden obiekt raportu.
- Bajak Protocol pozostaje w języku numerical audit / finite reconstruction / replication path, nie jako publiczny formalny proof RH.

## Walidacja
- `npm run verify:pass381-live-provider-orchestrator` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅

## Nadal do kolejnych passów
- Rzeczywiste provider keys i cache server dla live OHLCV.
- Większa unifikacja modala Shield i Real Markets na jeden komponent.
- Kolejne czyszczenie tekstów, aby publiczny surface był jeszcze mniej debugowy.
- Dalsze skracanie Security / Research Lab pod launch.
