# PASS 84 — Real VLM Data Tree Readout

## Cel passa
Po feedbacku ze screenów przebudowano animację analizy tak, żeby dane nie siedziały już jako zwykłe karty na dole. Dane mają wychodzić z kuli VLM po liniach, punkt po punkcie, na pełnym ekranie.

## Zmiany UX
- Basic Analysis pokazuje 10 najważniejszych danych.
- Advanced Analysis pokazuje 20 najważniejszych danych.
- Każda dana ma linię wychodzącą z centrum VLM do punktu końcowego.
- Linie, punkty i karty wyłaniają się sekwencyjnie, nie wszystkie naraz.
- Overlay VLM jest pełnoekranowy (`fixed inset-0`), żeby sieć mogła oddychać i czytać token na całym ekranie.
- Usunięto kartę `current signal` z prawego panelu, bo dublowała sens animacji.
- Usunięto czerwony/ zielony label ceny z wykresu świecowego, bo cena jest już pokazana na górze popupu.

## Basic data nodes
1. Risk core
2. Price
3. 24h momentum
4. Liquidity
5. Confidence
6. Volume
7. Volatility
8. Holder layer
9. Signal count
10. Verdict

## Advanced data nodes
1. Risk core
2. Live price
3. 24h momentum
4. 7d structure
5. Selected range
6. Liquidity stress
7. Orderbook
8. Volume
9. Market cap
10. Flow ratio
11. Confidence
12. Holder graph
13. Anomaly count
14. Top signal
15. Data quality
16. Source
17. Drawdown
18. Volatility
19. Access
20. Verdict

## Pliki zmienione
- `components/market-integrity/TokenRiskModal.tsx`
- `app/globals.css`

## Weryfikacja
Przeszło:
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`

Pełny typecheck wymaga lokalnego `npm install`, bo paczka nie zawiera `node_modules`.
