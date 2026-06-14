# Velmère — progres PASS617–621

| PASS | Obszar | Delta wdrożeniowa | Stan |
|---|---|---:|---|
| PASS617 | Non-crypto taxonomy lock w UI/API/provider catalog | +14 | DONE |
| PASS618 | Full-width adaptive table + mobile/tablet cards | +15 | DONE |
| PASS619 | Provider/timestamp/backup/freshness/confidence lineage | +16 | DONE |
| PASS620 | Cross-asset chart parity i evidence placeholder | +14 | DONE |
| PASS621 | Exact-only auto-open search i ambiguity receipt | +15 | DONE |
| **Razem** | Real Markets Exactness & Provider Lineage | **+74** | **RELEASED** |

## Łączny ostatni odcinek

| Pakiet | Delta |
|---|---:|
| PASS602–606 | +58 |
| PASS607–611 | +63 |
| PASS612–616 | +69 |
| PASS617–621 | +74 |
| **Łącznie PASS602–621** | **+264** |

## Regresje zabezpieczone

- Krypto i exchange token nie wracają przez provider search ani lokalny katalog Real Markets.
- `MEXC`/`Binance` jako venue-health nie są mylone z natywnym tokenem giełdy.
- Prefix lub podobna nazwa nie otwiera pierwszego wyniku automatycznie.
- Table/card/modal/chart nie pokazują sprzecznego stanu providera.
- Brak timestampu nie może dostać etykiety `live`.
- Tabela 1024+ nie wymaga poziomego scrolla.
- Mobile/tablet zachowują hierarchię danych, 44 px targety i reduced motion.
- Wykres bez source-bound candles nie udaje pełnego interaktywnego market chart.
