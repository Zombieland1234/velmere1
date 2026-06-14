# Velmère Master Build Map — PASS469

## A. Velmère Browser / Lens
- [x] Preserve result-first hierarchy from PASS467.
- [x] Preserve Browser → Shield / Orbit handoff from PASS468.
- [x] Keep Basic / Pro / Advanced selection visible in preview.
- [x] Add a responsive PDF toolbar that fits compact mobile widths.
- [x] Keep download, close, Shield and Orbit actions keyboard reachable.
- [x] Do not show a persisted receipt when browser storage rejects the write.

## B. PDF generation flow
- [x] Preserve the four-stage V forge.
- [x] Preserve the selected tier in the requested PDF route.
- [x] Keep one Blob for exact preview and download.
- [x] Keep background scroll lock from forge through preview.
- [x] Preserve Escape, focus trap and focus restoration.
- [ ] Execute the full flow in installed Chromium.

## C. A4 layout contract
- [x] Add versioned `pass469-a4-layout-v1` contract.
- [x] Define page dimensions and a reserved footer boundary.
- [x] Define audited regions for all four PDF pages.
- [x] Audit every Basic / Pro / Advanced region before drawing.
- [x] Reject negative heights, footer entry and vertical overlap.
- [x] Apply the audited coordinates inside the binary PDF route.

## D. Page 1 — human decision brief
- [x] Reserve separate regions for verdict, metadata, brief, market data, checked evidence and missing evidence.
- [x] Move page numbering and payload metadata into the safe footer.
- [x] Prevent the final missing-data panel from entering the footer.
- [x] Limit the title to two controlled lines.

## E. Page 2 — source ledger
- [x] Use audited row positions for up to four sources.
- [x] Preserve second-provider, next-action and provider-truth panels.
- [x] Compact oversized source labels instead of allowing page overflow.
- [x] Keep source freshness and confidence visible.

## F. Page 3 — selected tier
- [x] Advanced: retain separate Basic and Pro evidence grids.
- [x] Basic / Pro: allocate one larger selected-tier region.
- [x] Keep the missing-data policy above the reserved footer.
- [x] Use region height to compute safe text density.

## G. Page 4 — Advanced / confidence waterfall
- [x] Advanced: reserve regions for Advanced evidence, waterfall, missing fields and final action.
- [x] Basic / Pro: reserve waterfall, source boundary, next action and missing fields.
- [x] Remove the previous coordinates that could collide with the footer.
- [x] Keep page signature and number in the footer-safe zone.

## H. Long text and URL hardening
- [x] Hard-wrap otherwise unbreakable tokens.
- [x] Prevent contract addresses, checksums and filing URLs from crossing card bounds.
- [x] Recalculate maximum paragraph lines from actual panel height.
- [x] Compact headings and source values without exposing raw payloads.

## I. Download receipt
- [x] Add `pass469-pdf-download-receipt-v1`.
- [x] Record only a `download_initiated` event; do not claim OS-level save success.
- [x] Store filename, symbol, tier, report checksum, confidence and source count.
- [x] Explicitly store `containsRawPayload: false`.
- [x] Add deterministic receipt checksum and reject tampered entries.
- [x] Limit local history to 20 receipts.
- [x] Display receipt id only after successful browser persistence.

## J. Shield AI acknowledgement
- [x] Pass the validated PASS468 packet into the Shield AI panel.
- [x] Confirm Browser → Shield identity only after symbol equality.
- [x] State that Shield completed its own fresh scan.
- [x] State that the Browser packet is display-only context.
- [x] Preserve live provider / consensus enrichment independently.

## K. Runtime and E2E gates
- [x] Add PASS469 static and semantic verifier.
- [x] Test all three PDF depths and multiple source counts.
- [x] Test receipt round-trip and tamper rejection.
- [x] Add a Playwright flow for mobile toolbar, background scroll lock and browser download event.
- [x] Add overflow assertion using viewport scroll width.
- [x] Add body scroll-lock release assertion after close.
- [ ] Run Playwright after installing browser dependencies.

## L. Validation and blockers
- [x] PASS453–PASS469 regression chain.
- [x] PASS469 runtime layout semantics.
- [x] Full syntax sweep — 772 application TS/TSX files.
- [x] i18n PL / DE / EN.
- [x] Vercel preflight — 777 scanned files.
- [ ] Full `next build` pending installed `node_modules`.
- [ ] Browser pixel/PDF visual comparison pending Chromium.
- [ ] Live provider smoke pending deploy networking and configured secrets.

## M. Next pass
PASS470 — installable browser test harness, PDF screenshot comparison for all three tiers, keyboard-only preview QA, receipt history viewer and remaining runtime crash sweep across Real Markets / Shield / Orbit.
