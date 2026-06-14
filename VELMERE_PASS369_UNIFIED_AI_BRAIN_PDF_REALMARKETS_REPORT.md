# PASS369 — Unified AI Brain + PDF Parity + Real Markets Expansion

## Cel
Ten pass idzie w dokładnie ten obszar: Real Markets jak Shield, PDF preview/download bliżej 1:1, prostszy Security/Research Lab i jeden Velmère AI Brain, który obsługuje crypto, stocki, FX, commodities, real estate proxy i giełdy.

## Zrobione

### 1. Real Markets
- Dodany `MarketBrainAudit` w modalach Real Markets.
- Po kliknięciu instrumentu użytkownik widzi VLM coin, neuronową kulę i lane'y: source, price, depth, volume, issuer, filings, second source, risk output.
- Basic / Pro / Advanced zmienia liczbę output fields: 10 / 14 / 20.
- Dodane więcej instrumentów i ikon: EU/US stocks, banki, energy, luxury auto, healthcare, dodatkowe FX.
- Real Markets dostał marker `data-pass369-unified-real-markets-brain="true"`.

### 2. PDF preview / download parity
- Browser preview dostał `data-pass369-pdf-preview-download-parity="true"`.
- Preview używa locale-aware copy dla PL / DE / EN.
- Na ekranie dodana mapa sekcji PDF: 01 brief, 02 source rhythm, 03 second source, 04 boundary, 05 provider.
- PDF route dostał `reportPdfLabels(locale)` i `data-pass369-pdf-locale-parity="true"`.
- Przywrócony legacy preflight marker `not a safety certificate`.

### 3. Research Lab
- Research Lab dostał pass marker `data-pass369-bank-crypto-determinism-lab="true"`.
- Dodana karta: Banki i podpisy — TLS/transport, podpisy, HSM, event audit, limity, bez zdradzania reguł operatora.
- Zachowany uczciwy framing: Bajak Protocol jako finite numerical reconstruction / audit / falsification, nie publiczny dowód RH.

### 4. Footer / public wording
- Zamieniono brutalne „VLM jest warstwą dostępu, nie inwestycją” na bardziej premium i prawnie bezpieczne:
  - PL: „VLM to prywatna warstwa dostępu do narzędzi, dropów i Research Lab — bez obietnic ceny, zysku lub listingu.”
  - EN/DE analogicznie.

### 5. CSS / animation
- Dodane style `real-markets-pass369-brain`, `realMarketVlmCoin`, `realMarketBrainPulse`, `realMarketNeuralOrbit`.
- Dodany reduced-motion guard.
- Dodany `vlm-browser-pass369-page-map` dla parytetu PDF.

## Walidacja
Przeszło:
- `npm run verify:pass369-unified-ai-brain-pdf-realmarkets`
- `npm run verify:pass368-prime-crypto-research-lab`
- `npm run verify:pass367-browser-orbit-realmarkets`
- `npm run verify:pass366-runtime-scroll-lock`
- `npm run check:i18n`
- `npm run vercel:preflight`
- TS transpile syntax check dla zmienionych TS/TSX plików.

Pełny `typecheck` dalej nie jest oznaczany jako zielony, bo paczka eksportowa nie zawiera `node_modules` i projekt dziedziczy stare braki zależności/typów.

## Następny pass
PASS370 powinien iść w:
1. prawdziwe ujednolicenie TokenRiskModal Orbit 360 z tym samym MarketBrainAudit style,
2. PDF route v7: jeszcze bardziej zbliżyć manual PDF do HTML preview,
3. Real Markets provider contract: osobne adaptery dla SEC EDGAR, FX, commodities i exchange health,
4. dalsze odchudzanie publicznych copy walls.
