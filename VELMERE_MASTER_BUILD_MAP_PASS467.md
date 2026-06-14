# Velmère Master Build Map — PASS467

## A. Browser / Lens
- [x] Render committed result directly below the sticky search.
- [x] Move the PDF capsule below committed results in actual DOM order.
- [x] Keep onboarding capsule directly below search when no result exists.
- [x] Change capsule copy after result into a PDF next-step prompt.
- [x] Emphasize the primary result visually.
- [x] Auto-position the committed result below the sticky search with reduced-motion support.
- [ ] Next: browser-level keyboard/mobile walkthrough.

## B. Search request lifecycle
- [x] Separate suggestion and committed-detail AbortControllers.
- [x] Abort stale committed searches.
- [x] Prevent late responses from replacing newer results.
- [x] Clear stale result cards when a new committed scan starts.
- [x] Avoid false errors for aborted requests.
- [x] Abort requests on component cleanup.

## C. Search payload safety
- [x] Normalize result text fields at the client boundary.
- [x] Normalize `chips`, `missingData` and `sources` arrays.
- [x] Clamp confidence to 0–100.
- [x] Remove duplicate client results.
- [x] Provide conservative source-required fallbacks.
- [x] Prevent malformed provider payloads from crashing result cards.

## D. Real Markets catalog
- [x] Replace unsafe repeated symbol `.trim()` calls with one normalizer.
- [x] Filter empty/invalid symbols before catalog deduplication.
- [x] Preserve stock/ETF/REIT universe sharing with Browser.
- [x] Preserve exact-match result priority.
- [ ] Next: persistent catalog telemetry and alias coverage.

## E. Basic analysis
- [x] Keep the primary result before product education content.
- [x] Preserve price, market cap/net assets, 24h, volume and source.
- [x] Preserve conservative fallbacks for missing fields.
- [x] Keep Basic PDF isolated from Pro/Advanced matrices.

## F. Pro analysis
- [x] Preserve second-source, freshness and provider boundaries.
- [x] Prevent stale search responses from changing the selected asset.
- [x] Keep market-class-aware evidence fields.
- [x] Preserve confidence caps.

## G. Advanced analysis
- [x] Preserve SEC/XBRL, FCF, leverage and ETF evidence.
- [x] Preserve confidence waterfall and anomaly layer.
- [x] Keep malformed arrays from crashing evidence cards.
- [x] Keep source-required state instead of raw `unknown`.

## H. PDF V-forge
- [x] Keep four visible V-generation stages.
- [x] Give the user a real tier-selection window.
- [x] Capture selected tier after source collection.
- [x] Disable tier buttons after the documented lock point.
- [x] Add forge request cancellation and stale-request protection.
- [x] Preserve one-Blob preview/download parity.
- [ ] Next: measured browser timings and cancellation UI.

## I. PDF modal / scroll / focus
- [x] Keep background scroll lock through forge → preview.
- [x] Treat interactive forge as an aria-modal dialog.
- [x] Move initial focus to the active tier button.
- [x] Trap Tab navigation inside the forge.
- [x] Preserve preview Escape, focus trap and focus restoration.
- [ ] Next: Playwright keyboard and wheel/touch assertions.

## J. Shield / Orbit handoff
- [x] Preserve PASS453 unified handoff fields.
- [x] Preserve source/fundamental evidence packet.
- [x] Prevent stale Browser requests from handing off the wrong asset.
- [ ] Next: direct in-memory result packet handoff into Shield and Orbit.

## K. i18n and accessibility
- [x] Add result-first labels in PL/DE/EN.
- [x] Add dynamic after-result PDF copy in PL/DE/EN.
- [x] Add combobox/listbox/option semantics.
- [x] Preserve reduced-motion behavior for automatic positioning.
- [x] Preserve translated Basic/Pro/Advanced copy.
- [ ] Next: screen-reader walkthrough with active-descendant keyboard navigation.

## L. Validation and blockers
- [x] PASS453–PASS467 regression chain.
- [x] PASS467 DOM-order assertion.
- [x] PASS467 stale-request and payload-guard markers.
- [x] Native-constructor/lucide collision scan.
- [x] 779 TS/TSX parser sweep.
- [x] i18n validation.
- [x] Vercel preflight.
- [ ] Full `next build` pending dependencies.
- [ ] Chromium/Playwright flow pending browser runtime.
- [ ] Live provider smoke pending deployment networking/secrets.

## M. Next pass
PASS468 — real-browser Browser → result → V forge → selected tier → preview → download → close test, measured A4 overflow gates and direct Shield/Orbit packet handoff.
