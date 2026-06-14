# PASS379 — Live Provider Brain Contract

## Cel
Real Markets ma zachowywać się jak Shield: logo, świecowy wykres, timeframe, Basic / Pro / Advanced, VLM AI Brain i PDF mirror.

## Wdrożone
- Nowy moduł `lib/market-integrity/pass379-live-provider-brain-contract.ts`.
- +40 provider-ready instrumentów: banki, giełdy infrastrukturalne, EU/Asia stocki, FX, rates/credit ETF, commodities i real estate proxy.
- PASS379 AI Brain: 10 / 14 / 20 pól z human-copy zamiast debugowych kafelków.
- Provider readiness rails: timestamp, OHLCV, second source, issuer/reference, fallback flag.
- Security page: publiczny opis warstw ochrony bez zdradzania reguł operatora.
- Research Lab: banki → ECC/BTC → entropy/RNG → prime audit → Bajak Protocol jako audyt i replikacja.
- Browser PDF: nowa strona PASS379 z tym samym report object dla preview/download.

## Granice
Nie udajemy live ceny bez providera, timestampu, cache age i fallback flag. Bajak Protocol pozostaje numerical audit / falsification path, nie formalny proof RH.
