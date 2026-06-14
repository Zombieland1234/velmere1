# Velmère Master Build Map — PASS465

## A. Browser / Lens
- [x] Keep sticky search and empty-state prevention from PASS456–PASS464.
- [x] Add Basic / Pro / Advanced selection during V-forge.
- [x] Keep 4-stage V animation active while the user can choose depth.
- [x] Preserve preview/download parity with one Blob.
- [x] Add selected-depth badge in preview.
- [ ] Next: stock/ETF/REIT search results directly in Browser suggestions.

## B. PDF
- [x] Accept `tier=basic|pro|advanced` in Lens PDF route.
- [x] Basic: price, market cap, 24h, volume, source state and next step.
- [x] Pro: source contract, provider plan, consensus/freshness context.
- [x] Advanced: full evidence matrix with SEC/XBRL and fundamental gates.
- [x] Keep A4 report generation compatible with preview.
- [ ] Next: pixel-perfect final typography and section rhythm.

## C. Real Markets
- [x] Keep provider truth router and consensus from PASS458–PASS463.
- [x] Add PASS465 SEC/XBRL second-source readiness markers.
- [x] Add SEC/XBRL panel to fundamentals area.
- [x] Do not make SEC absence look like proof.
- [ ] Next: more exchange/fundamental drilldowns per asset class.

## D. Shield AI
- [x] Keep Shield AI source contract from PASS457–PASS464.
- [x] Allow SEC/XBRL quality to influence confidence cap through the shared packet.
- [x] Avoid raw `unknown` in user-facing answers.
- [ ] Next: explain SEC filing links and divergence in natural PL/DE/EN text.

## E. Canonical pair resolver
- [x] Fix `safeUpper(undefined)` crash.
- [x] Keep canonical venue pair logic for BTC/ETH/SOL/XRP/etc.
- [x] Preserve quote-basis penalty and unsupported-pair handling.

## F. UI runtime safety
- [x] Fix `Map` icon import shadowing native `Map`.
- [x] Use `globalThis.Map` for dedupe path.
- [x] Keep Real Markets modal stable after the crash report.

## G. SEC/XBRL
- [x] Add `pass465-sec-xbrl-quality.ts`.
- [x] Compare key facts against Alpha Vantage statement metrics.
- [x] Add filing cadence and archive URL handling.
- [x] Cache and dedupe Companyfacts/Submissions fetches.
- [ ] Next: deeper taxonomy mapping and multi-period XBRL history.

## H. Provider limits
- [x] Heavy SEC/Alpha requests remain detail-mode, not table-mode.
- [x] Cache and inflight dedupe prevent accidental duplicate pulls.
- [ ] Next: persistent quota ledger for SEC/Alpha in production.

## I. i18n
- [x] Preserve PL/DE/EN checks.
- [x] Add translated PDF depth labels/descriptions in Browser client.
- [ ] Next: translate SEC/XBRL explanatory copy in deeper AI responses.

## J. Validation
- [x] PASS453–PASS465 verifier chain.
- [x] i18n check.
- [x] Vercel preflight.
- [x] Runtime semantic tests for SEC/XBRL parser.
- [ ] Full `next build` pending local dependencies.

## K. Blockers closed
- [x] `Cannot read properties of undefined (reading 'trim')`.
- [x] `Map is not a constructor` from lucide icon collision.
- [x] PDF no longer forced to include Basic+Pro+Advanced in one generated report.

## L. New blockers
- [ ] Need live SEC/Alpha configuration in deployment.
- [ ] Need browser-level PDF download test with Chromium.
- [ ] Need stock/ETF/REIT Browser search expansion.

## M. Next pass
PASS466: PDF A4 final polish + Browser multi-asset search + SEC filing link UX + confidence waterfall.
