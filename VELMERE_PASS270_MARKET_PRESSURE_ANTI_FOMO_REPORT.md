# PASS270 — Market-pressure anti-FOMO rail

## Zakres

PASS270 przechodzi do C10 z master mapy: Pump / low-float behavior.

## Wdrożenie

- Dodano `lib/market-integrity/market-pressure-regime.ts`.
- Token modal dostał kompaktową szynę `data-pass270-market-pressure-rail` pod asset-regime gate.
- Rail pokazuje pięć krótkich punktów: float, unlock, depth, hype i trust.
- Szybki wzrost ceny, thin liquidity, FDV gap i brak źródeł podnoszą pressure score.
- Komunikacja jest anti-FOMO: UI spowalnia decyzję, nie generuje buy/sell presji.
- Zachowany compact dock PASS269 oraz brak opisowych sekcji OPIS z PASS268.

## Psychologia / premium boundary

- FOMO jest potraktowane jako ryzyko użytkownika, nie jako narzędzie sprzedaży.
- Status/premium idzie przez kontrolę, spokój, czytelny proof i zaufanie.
- MwSt / legal-safe copy pozostaje w trust rail bez obietnicy zysku.

## Delta mapy

| ID | Obszar | Previous | Current | Change |
|---|---|---:|---:|---:|
| C10 | Pump / low-float behavior | 41% | 50% | +9% |
| L02 | Orderbook feed | 22% | 24% | +2% |
| L04 | Unlock / vesting feed | 20% | 22% | +2% |
| D15 | Risk driver mapping | 82% | 83% | +1% |
| M04 | Safe export wording | 83% | 84% | +1% |

## Walidacja

```bash
npm run verify:pass270-market-pressure-anti-fomo
npm run verify:pass269-compact-mode-asset-regime-chart-drag
npm run verify:pass268-chart-gesture-mode-dock
npm run vercel:preflight
```

## Następny krok

Następny pass powinien ruszyć C11/L03: contract trap behavior — owner, proxy, mint, pause, blacklist, tax, honeypot and source-proof summary w tym samym kompaktowym stylu.
