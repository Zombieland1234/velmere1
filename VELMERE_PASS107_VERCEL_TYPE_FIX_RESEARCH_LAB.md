# VELMERE PASS 107 — Vercel TokenRiskResult Type Fix + Research Lab

## Base
Built on PASS 106.1 runtime/autosuggest hotfix.

## Critical Vercel fix
Vercel error:
`Property 'limitations' does not exist on type 'TokenRiskResult'.`

File:
`components/market-integrity/TokenRiskModal.tsx`

Cause:
PASS 106 read:
`result.limitations`

But the actual type stores limitations inside:
`result.metaModel?.limitations`

Fix:
- added `missingLimitations = result.metaModel?.limitations ?? []`
- `missingData` now reads from `missingLimitations`
- direct `result.limitations` references removed

## Existing runtime fixes retained
Still fixed:
- `index is not defined`
- no duplicated `RISK {riskScore}%` under the VLM orb
- no duplicated `odczyt ryzyka` / `risk extraction`
- `safeTileIndex` remains in the tile transform
- advanced SVG line spaghetti remains disabled
- autosuggest remains in Shield Map investigator search

## New Research Lab section
Added a safer Prime/Cryptography/Inverse Formula section to Shield Map:
- PL / DE / EN aware
- frames Bajak Protocol as numerical audit / research pipeline
- explicitly avoids claiming RH proof
- explicitly avoids suggesting wallet/private-key/Bitcoin-breaking capabilities
- positions primes + cryptography as product/research storytelling with replication discipline

## Why this wording is strict
The latest numerical audit document says the work should be framed as a finite numerical reconstruction audit, not a theorem or RH proof. Therefore the site copy must be powerful but cautious.

## Validation
Passed:
- `node scripts/check-i18n.mjs`
- `node scripts/vercel-preflight.mjs`
- `node scripts/verify-market-integrity-no-truncation.mjs`
- `node scripts/verify-shield-design-safety.mjs`

Static regression checks:
- raw `<img>` in TSX: 0
- direct MapIterator spreads: 0
- likely unescaped JSX apostrophes: 0
- `result.limitations`: 0
- `RISK {riskScore}%`: 0
- `odczyt ryzyka`: 0
- `risk extraction`: 0
- raw `index %` tile transform bug patterns: 0

## Not fully run
Full `npm run build` was not run locally because this ZIP does not include node_modules and the sandbox cannot reliably perform Vercel's full npm install/build. Vercel remains final build authority.

## Next
PASS 108 should:
- move Shield Map inline locale strings into locale JSON,
- translate the old PASS archive fully,
- add autosuggest to the main market terminal search,
- add real Basic/Pro/Advanced plan separation,
- continue 3D brain carousel rewrite,
- add Prime Research Lab route if the section looks good.
