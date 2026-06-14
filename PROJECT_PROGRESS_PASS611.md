# Velmère — progres PASS607–611

| PASS | Obszar | Delta wdrożeniowa | Stan |
|---|---|---:|---|
| PASS607 | Claim-source completeness gate i freshness caps | +14 | DONE |
| PASS608 | Actionable missing-source appendix | +11 | DONE |
| PASS609 | Lokalizacyjny dynamiczny skład A4 | +12 | DONE |
| PASS610 | Reader/download parity manifest i serwerowy 409 gate | +14 | DONE |
| PASS611 | StructTreeRoot, marked content i accessibility phase 2 | +12 | DONE |
| **Razem** | PDF Source Parity Release | **+63** | **RELEASED** |

## Łączny ostatni odcinek

| Pakiet | Delta |
|---|---:|
| PASS602–606 | +58 |
| PASS607–611 | +63 |
| **Łącznie PASS602–611** | **+121** |

## Regresje zabezpieczone

- Claim bez źródła lub timestampu nie może pozostać `confirmed`.
- Czas wygenerowania raportu nie jest używany jako fałszywy czas obserwacji providera.
- Braki nie tworzą pustej strony ani generycznego tekstu AI.
- Reader i pobierany PDF nie mogą przyjąć różnego manifestu treści.
- Długie PL/DE/EN bloki są przenoszone, a nie nakładane.
- Publiczny header PDF nie pokazuje wewnętrznej diagnostyki operatora.
- Tagged structure jest jawnie przygotowana bez nieuprawnionego claimu PDF/UA.
