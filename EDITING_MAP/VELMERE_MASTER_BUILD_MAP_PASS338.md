# VELMÈRE MASTER BUILD MAP — PASS338

## PASS338 — Second Source Divergence Matrix

Zakres: Cross-Asset Shield, Lens A4/PDF, Global Risk/Exchange Health AI bot.

### Dodane
- `lib/market-integrity/second-source-divergence-matrix.ts`
- `/api/market-integrity/second-source-divergence`
- `/api/market-integrity/cross-asset` zwraca `secondSourceDivergence`
- Cross-Asset UI renderuje `Second Source Divergence Matrix`
- Lens A4 preview ma `Second-source check`
- PDF/HTML Lens report ma `SECOND-SOURCE CHECK`
- Guard: `verify:pass338-second-source-divergence-matrix`

### Lanes
- exchange depth divergence
- API freshness divergence
- reserve context divergence
- stock disclosure divergence
- FX reference divergence
- real estate macro divergence
- FTX historical regression

### Safety boundary
- zero `next FTX` jako claim
- zero `exchange is collapsing`
- zero `withdraw now`
- zero solvency / exchange safety certificate
- bot może mówić tylko o source disagreement, cadence, missing evidence i second-source requirement

### Następny krok
PASS339: real adapter contract for second-source fetch status + UI badges in Exchange Health rows.
