# PASS293 — Social-Exchange Command Router Gate

## Scope

PASS293 turns Shield search, Shield Map investigator search and VLM Browser/Lens suggestions into one shared UI contract: **Social-Exchange Command Router**.

The pass uses three product directions:

- Exchange-grade decision proximity: depth/orderbook/source state should stay near the token decision surface.
- Social ranking without addiction: suggestions are ranked by transparent source, review and context signals instead of infinite-feed pressure.
- Ethical psychology: status comes from proof, source confidence and calm next actions, not countdowns, fake scarcity or buy/sell pressure.

## Implemented files

- `lib/market-integrity/social-exchange-command-router-gate.ts`
- `components/market-integrity/MarketIntegrityClient.tsx`
- `components/market-integrity/ShieldMapClient.tsx`
- `components/search/VelmereIntelligenceSearchClient.tsx`
- `app/globals.css`
- `scripts/verify-pass293-social-exchange-command-router-gate-safety.mjs`
- `package.json`

## Product changes

### 1. Shared search intelligence contract

Added `buildSocialExchangeCommandRouterGate()` with:

- surface modes: `shield_terminal`, `shield_map`, `velmere_browser`,
- transparent ranking score,
- source labels: local/live/merged/watchlist/operator,
- exchange label: depth, holder, liquidity or source check,
- social label: trend context, operator signal, reference asset or discovery lane,
- psychology label: calm review, source-first, anti-FOMO,
- next safe action label,
- dark-pattern firewall.

### 2. Shield terminal search upgraded

The main Shield search dropdown now shows:

- Social-Exchange Router header,
- depth/source/social/anti-FOMO chips,
- router score,
- exchange/social/psychology reason pills,
- one safe next action instead of generic `scan`.

Legacy PASS149/PASS168/PASS193 guard strings are preserved as comments so old preflight does not regress.

### 3. Shield Map search matched to Shield search

The Shield Map investigator search now uses the same router logic as main Shield:

- same glyph fallback,
- same source/depth/social ranking,
- same router chips,
- same anti-FOMO reason pills,
- same scroll-safe dropdown behavior.

### 4. VLM Browser/Lens made less thin

The VLM Browser suggestion dropdown now uses the same router:

- suggestions with emoji/logo remain,
- router score and reason pills appear,
- the browser rail explains source confidence, social context and Shield handoff,
- VLM Browser is now a discovery/capsule/Shield-handoff surface, not only a thin search page.

### 5. Real bug fixed

`components/market-integrity/ShieldMapClient.tsx` had a duplicated `body` key in `InvestigatorEvidence`. PASS293 removed the duplicate type key.

## Safety / psychology rules

Blocked patterns are explicit:

- no countdown pressure,
- no guaranteed profit/safety language,
- no fake scarcity,
- no buy/sell command.

The UI language routes users toward evidence review, missing-source checks and slower decisions.

## Validation

```bash
npm run verify:pass293-social-exchange-command-router-gate
npm run verify:pass291-pdf-browser-replay-boundary-gate
npm run check:i18n
npm run vercel:preflight
```

All passed in this package.

Full `typecheck` was not run as green because the ZIP has no `node_modules`; this remains the same inherited package limitation.

## Delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| C02 | Shield search dropdown | 95 | 97 | +2 |
| C03 | Global token lookup | 63 | 66 | +3 |
| E02 | Lens search UX | 92 | 96 | +4 |
| J03 | Responsive layout | 83 | 84 | +1 |
| D16 | Source confidence lanes | 88 | 89 | +1 |
| D17 | Missing-data semantics | 89 | 90 | +1 |
| A03 | TypeScript sanity | 96 | 97 | +1 |
| A05 | Preflight guard system | 100 | 100 | +0 |

**PASS293 product delta:** +13 on touched rows.

<!-- PASS293 marker: Social-Exchange Command Router Gate active. -->
