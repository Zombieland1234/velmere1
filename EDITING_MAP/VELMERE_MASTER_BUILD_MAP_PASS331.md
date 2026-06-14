# Velmère PASS331 — Cross-Asset AI Bot / Exchange Collapse Radar

## Cel
VLM Shield ma nie patrzeć tylko na pojedynczy token. PASS331 rozbija radar na osobne tabele:
- crypto exchanges / venues,
- stocks / equities,
- FX / currencies,
- real estate / REIT / housing,
- FTX historical regression pack.

## Nowe elementy
- `CrossAssetAdapterRow` — plan źródeł, cadence, anomaly signals i boundary per tabela.
- `CollapseSignalRow` — sygnały w stylu FTX: depth cascade, reserve/liability gap, native-token dependency, withdrawals, macro contagion.
- `BotDecisionRule` — zasady AI bota: żadnych oskarżeń, żadnych gwarancji, second-source przed warningiem.
- UI: `Adapter blueprint`, `Collapse signal engine`, `AI bot decision rules`.
- API: `/api/market-integrity/cross-asset` zwraca rozszerzony radar z boundary.

## Boundary
To jest early-warning research surface:
- nie przewiduje bankructwa,
- nie certyfikuje giełdy,
- nie jest proof of solvency,
- nie jest poradą inwestycyjną,
- nie oskarża publicznie bez źródeł.

## Następne ID / PASS332
1. Dodać live adapter skeleton dla `exchange_health`: Binance/MEXC `depth`, `klines`, `bookTicker`, source timestamp.
2. Zrobić `secondSourceDivergenceScore`.
3. Dodać `FTXRegressionScore` z wagami: native-token loop, withdrawal stress, reserve/liability gap, contagion.
4. Dodać customer-safe AI summary: "co bot widzi / czego brakuje / jaki następny krok".
