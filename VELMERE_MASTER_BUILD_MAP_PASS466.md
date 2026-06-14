# Velmère Master Build Map — PASS466

## A. Browser / Lens
- [x] Add `Rynki / Märkte / Markets` mode.
- [x] Reuse the Real Markets universe for stock, ETF and REIT discovery.
- [x] Keep suggestions pinned to the Browser input.
- [x] Separate lightweight suggestions from committed detail scans.
- [x] Do not spend keyed provider quota while typing.
- [x] Preserve exact-result priority and deduplication.
- [ ] Next: full browser-level keyboard and mobile QA.

## B. V-forge generation
- [x] Preserve the four visible generation stages.
- [x] Preserve the large V animation.
- [x] Keep Basic / Pro / Advanced selection during generation.
- [x] Keep selected depth attached to preview and download.
- [x] Keep background scroll locked throughout generation → preview transition.
- [ ] Next: measure animation frame pacing on low-power mobile devices.

## C. PDF A4
- [x] Keep preview/download parity through one Blob.
- [x] Render only the selected tier in the human reader.
- [x] Keep four-page binary PDF structure.
- [x] Add confidence waterfall to A4 evidence page.
- [x] Rebalance Advanced grid and waterfall so sections do not overlap the footer.
- [x] Preserve download icon and selected-depth filename.
- [ ] Next: Chromium pixel comparison for Basic, Pro and Advanced exports.

## D. Basic analysis
- [x] Keep price, market cap/net assets, 24h, volume and primary source first.
- [x] Add visible final confidence boundary.
- [x] Avoid exposing Pro/Advanced matrices when Basic was selected.
- [x] Keep missing evidence human-readable.

## E. Pro analysis
- [x] Add second-source, freshness and provider contract stages.
- [x] Expose the source plan without raw provider dumps.
- [x] Keep market-class-aware fields for stock, ETF and REIT.
- [x] Preserve confidence caps from consensus and fundamentals.

## F. Advanced analysis
- [x] Preserve the full evidence-dense tier.
- [x] Include SEC/XBRL state, FCF, leverage and filing quality when available.
- [x] Include ETF concentration/overlap/top holdings where applicable.
- [x] Add six-stage confidence waterfall.
- [x] Do not promote partial evidence to source-bound truth.

## G. Real Markets
- [x] Share the market catalog with Browser.
- [x] Keep asset-class deduplication.
- [x] Keep venue health separate from ordinary equities.
- [x] Preserve provider truth, consensus, canonical pairs and fundamentals layers.
- [ ] Next: unify Browser selection handoff with Real Markets row/modal state.

## H. SEC / filings
- [x] Carry SEC state, coverage, form, date and URL into detailed Browser results.
- [x] Show direct filing link on result card when available.
- [x] Show direct filing link in the human PDF reader when available.
- [x] Keep absent filings as a source requirement, not a fake link.
- [ ] Next: filing history drawer and period comparison.

## I. Confidence system
- [x] Add identity cap.
- [x] Add primary-source cap.
- [x] Add second-source cap.
- [x] Add freshness cap.
- [x] Add fundamentals cap.
- [x] Add final Basic/Pro/Advanced product boundary.
- [x] Enforce monotonic confidence: missing evidence cannot raise the score.
- [ ] Next: expose exact confidence deductions to Shield AI explanations.

## J. Shield AI / Shield Map
- [x] Preserve PASS457–PASS465 source-bound AI contract.
- [x] Keep Browser report compatible with unified Shield handoff.
- [x] Keep provider/fundamental evidence serializable for AI.
- [ ] Next: automatic market detail packet handoff into Shield and Orbit 360.

## K. i18n and accessibility
- [x] Add market mode in PL/DE/EN.
- [x] Preserve translated PDF depth copy.
- [x] Preserve focus trap, Escape, focus restoration and scroll lock.
- [x] Preserve semantic direct filing links.
- [ ] Next: screen-reader walkthrough of complete PDF workflow.

## L. Validation and blockers
- [x] PASS453–PASS466 regression chain.
- [x] PASS466 runtime waterfall semantics.
- [x] 779 TS/TSX parser sweep through the PASS466 verifier.
- [x] i18n validation.
- [x] Vercel preflight.
- [ ] Full `next build` pending dependencies.
- [ ] Live Alpha Vantage/SEC smoke pending deployment secrets.
- [ ] Chromium PDF visual/E2E test pending browser runtime.

## M. Next pass
PASS467 — Browser-to-Shield market handoff, Playwright PDF journey, measured A4 overflow gates and persistent provider telemetry.
