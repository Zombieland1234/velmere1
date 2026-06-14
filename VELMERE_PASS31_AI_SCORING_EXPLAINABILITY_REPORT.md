# Velmère Pass 31 — AI Scoring Explainability Layer

## Co zmieniono

Dodano warstwę wyjaśnialności wyniku dla Velmère Shield. Obecny wynik 0–100 nie jest procentowym prawdopodobieństwem oszustwa ani poradą inwestycyjną. To indeks anomalii market-integrity zbudowany z punktowanych sygnałów.

## Obecny sposób liczenia

1. Backend pobiera dane z publicznych źródeł: CoinGecko, DEX Screener, Binance depth i GoPlus dla kontraktów.
2. Dane są mapowane do `TokenRiskInput`.
3. `risk-engine.ts` sprawdza sygnały: velocity/pump, drawdown, volume, liquidity, order book, holders/supply, smart contract flags.
4. Każdy sygnał dodaje punkty ryzyka.
5. Wynik końcowy jest obcinany do 100.

Skala:
- 0–34: niski wykryty poziom anomalii
- 35–64: podwyższone ryzyko
- 65–84: możliwy profil manipulacyjny
- 85–100: krytyczny profil market-integrity

## Nowa warstwa Pass 31

Dodano pola:

- `scoreFormula` — jawnie pokazuje, jakiego modelu używa wynik,
- `confidence` — szacuje pewność danych na podstawie liczby dostępnych metryk i jakości źródła,
- `scoreBreakdown` — rozbija ocenę na agentów:
  - Velocity / pump,
  - Liquidity / volume,
  - Order book / microstructure,
  - Holders / supply,
  - Smart contract,
  - Data quality.

## Droga do AI

To nadal nie jest produkcyjny model ML/LLM ani pełny agent internetowy. To etap 1 pod multi-agent AI: transparentna fuzja sygnałów. Następne etapy powinny dodać:

1. historyczny cache tokenów,
2. batch scanner / cron,
3. on-chain holders i transfer graph,
4. social/news anomaly scanner,
5. multi-agent meta-model,
6. raport PDF/JSON dla case studies.
