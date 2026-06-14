# PASS386 — Exact Mirror Terminal

## Cel
Dociągnąć Real Markets, Browser PDF, Shield, Security i Research Lab do jednego czystego kontraktu produkcyjnego: jeden terminal, jeden AI Brain, jeden resolved report object, jeden język strony, mniej historii passów i mniej losowego fillera.

## Implementacja
- Dodano `lib/market-integrity/pass386-exact-mirror-terminal.ts`.
- Dodano PASS386 exact mirror contract: Real Markets → Shield chart → VLM Brain → Security bridge → Prime Lab → PDF mirror.
- Dodano kolejne instrumenty provider-ready: tradycyjne giełdy, rating/data, cybersecurity/AI, EU stocki, FX, commodities, REIT/ETF proxy.
- Dopisano visual patch i pseudo-price patch, żeby Real Markets nie wyglądało jak puste kółka.
- Real Markets modal dostał `real-markets-pass386-exact-readout` i ukrywa starsze PASS383–PASS385 readouty na publicznym widoku.
- API `/api/market-integrity/real-markets/catalog` dopięte do PASS386.
- Lens report dostał stronę `PASS386 EXACT MIRROR TERMINAL` oraz `pass386Readout` w resolved report object.
- Security page dostała jedną prostą sekcję: private key, signature proof, provider truth, entropy quality, redacted report.
- Research Lab dostał jedną prostą sekcję edukacyjną: banki → kryptografia → ECC/BTC → real RNG → liczby pierwsze → Bajak Protocol.

## Guardrails
- No fake live: live confidence dopiero po timestamp, OHLCV, cache age, fallback flag i second source.
- No wallet instructions: RNG/TRNG jest tłumaczone jako jakość entropii, nie instrukcja tworzenia portfela.
- No overclaiming: Bajak Protocol zostaje numerical audit / finite reconstruction / falsification / replication path.
- No pass-history wall: publiczny terminal pokazuje jeden readout, nie stare debugowe panele.

## Walidacja
- `npm run verify:pass386-exact-mirror-terminal` ✅
- `npm run verify:pass385-production-closure-brain` ✅
- `npm run check:i18n` ✅
- `npm run vercel:preflight` ✅

`vercel:preflight` scanned 688 files.
