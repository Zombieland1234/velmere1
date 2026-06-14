# PASS374 · Unified Market AI / PDF Contract

## Zrobione
- Real Markets dostał szeroki katalog provider-ready: US/EU/Asia stocks, G10/EM FX, ETF/factors, commodities i real-estate proxy.
- Każdy instrument ma trzymać ten sam kontrakt jak Shield: logo, świecowy chart, source state, risk, Basic / Pro / Advanced, AI Brain i PDF parity.
- AI Brain dostał finalny field deck 10/14/20: Basic, Pro i Advanced renderują krótkie, ludzkie pola zamiast debugowych kafelków.
- PDF route dostał PASS374 page, żeby preview/download korzystały z tego samego resolved report object i locale.
- Security page została uproszczona: private key, signature proof, real-world entropy, redacted reports, AI Brain review, Research boundary.

## Granica bezpieczeństwa
- Nie udajemy live cen bez timestamp/cache/fallback/second-source.
- Research Lab pokazuje liczby pierwsze i Bajak Protocol jako numerical audit, falsification i reproducibility path, nie formalny dowód RH.
- Crypto/ECC/RNG są opisane edukacyjnie; strona nie prosi o seed phrase ani prywatny klucz.

## Guard
`npm run verify:pass374-unified-market-ai-pdf-contract`
