# PASS271 — Contract Trap Gate

## Scope

- C11 — Contract trap behavior
- L03 — Contract analyzer UI envelope
- D15/D16/D17 — risk-driver mapping, source-confidence lanes and missing-data semantics
- M04 — safe wording

## Product delta

- Added `lib/market-integrity/contract-trap-regime.ts`.
- Token modal now renders `data-pass271-contract-trap-gate` below market pressure.
- Compact rails show: address, owner/proxy, mint/pause, blacklist, tax and sell path.
- Missing chain/address, analyzer freshness and tax simulator are explicit blockers.
- Contract risk language remains review-based: no accusation, no safety certificate and no financial advice.

## Progress delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| C11 | Contract trap behavior | 32 | 43 | +11 |
| L03 | Contract analyzer | 32 | 35 | +3 |
| D15 | Risk driver mapping | 83 | 85 | +2 |
| D16 | Source confidence lanes | 88 | 89 | +1 |
| D17 | Missing-data semantics | 89 | 90 | +1 |
| M04 | Safe export wording | 84 | 85 | +1 |

**PASS271 product delta:** +19 points on touched rows.

## Validation

```bash
npm run verify:pass271-contract-trap-gate
npm run verify:pass270-market-pressure-anti-fomo
npm run verify:pass269-compact-mode-asset-regime-chart-drag
npm run check:i18n
npm run vercel:preflight
```

## Remaining blockers

- Real per-chain contract analyzer provider still needed.
- Explorer/proxy/bytecode ownership scan is not yet durable storage.
- Tax/honeypot/sell simulation remains source-gated until live adapter exists.

<!-- PASS271 marker: Contract trap gate active. -->
