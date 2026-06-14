# PASS269 — Compact mode dock + asset-regime reserve gate + direct chart drag correction

## Zakres
- C07 Chart engine
- C08 Token modal shell
- C09 Stablecoin / pegged asset behavior
- D18 Basic / Pro / Advanced depth contract
- J02 Accessibility / ARIA
- M04 Safe export wording

## Zmiany wdrożone
- Odwrócono runtime math panningu po screenshot QA: widoczny wykres ma iść za ręką użytkownika, a nie przeciwko niej.
- Usunięto widoczne, paragraph-heavy sekcje opisu z prawego panelu VLM w token modal.
- Zmieniono panel Basic / Pro / Advanced w kompaktowy action dock.
- Dodano pierwszy asset-regime gate: stable/pegged, commodity-backed, major asset, token market, unknown asset.
- Dla XAUT/PAXG i aktywów commodity-backed UI wymusza język: custody proof / reserve gate / redemption spread.
- Dla stablecoinów UI wymusza język: peg proof / reserve + depeg gate.
- Dodano CSS dla compact dock i proof-gate chips bez buy-pressure, bez safety-certificate wording.

## Psychologia / trust
- Status i FOMO nie są użyte jako presja zakupu.
- Wprowadzono “proof-gate scarcity”: dostęp do mocniejszego briefu zależy od źródeł, nie od hype.
- MwSt/trust rail zostaje jako spokojny sygnał wiarygodności UI, ale bez gwarancji finansowej.

## Delta
| ID | Previous | Current | Change |
|---|---:|---:|---:|
| C07 | 91% | 92% | +1% |
| C08 | 94% | 95% | +1% |
| C09 | 35% | 40% | +5% |
| D18 | 91% | 92% | +1% |
| J02 | 63% | 64% | +1% |
| M04 | 87% | 88% | +1% |

## Guard
- `verify:pass269-compact-mode-asset-regime-chart-drag`

## Blokery nadal aktywne
- Real reserve/depeg/custody adapters nie są jeszcze podłączone.
- Real browser mouse/touch QA nadal wymagane.
- Customer export/PDF nadal gated przez source freshness, durable storage i redaction.
