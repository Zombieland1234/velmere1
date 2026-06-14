# Velmère PASS580–586 — PDF compositor and chart interaction release

## Scope

This package continues directly from PASS579. The batch targets two high-impact public surfaces: the Velmère Lens Reader/download pipeline and the shared Shield/Real Markets chart. The implementation prevents report-density regressions before render, makes source references compact but inspectable, rejects Reader/download payload drift, and replaces chart interactions that could steal mobile page scrolling with an explicit gesture contract.

## PASS580 — deterministic PDF visual fixture matrix

- Added a 27-case fixture matrix: 3 locales × 3 analysis depths × 3 content-density profiles.
- Each report receives a deterministic fixture and snapshot key based on locale, selected tier, density, source count, field budget and source-bound checksum.
- Overloaded fixtures are marked for review rather than being silently accepted.
- Added a serialized fixture catalogue for release regression tooling.
- Boundary: this is a deterministic layout/fixture contract; the package does not claim browser screenshot pixel comparison was executed in the dependency-free packaging environment.

## PASS581 — pre-render A4 page compositor

- Added a four-page content planner for Decision, Evidence, Analysis and Boundaries.
- Text and row weight are measured before render against page-specific capacities.
- Oversized blocks are moved forward when possible or compacted before they can collide with the reserved A4 footer.
- Reader surfaces expose compositor status, moved blocks and compacted blocks instead of relying on CSS alone.

## PASS582 — compact source citation rail

- Every source receives a stable public ID such as `S01`, `S02` and a stable Reader anchor.
- Reader source details use progressive disclosure: the document remains clean while freshness, confidence, source mode and evidence notes remain available on demand.
- Downloaded PDF source rows use the same citation IDs as the Reader.
- Confirmed, partial and missing evidence counts remain explicit.

## PASS583 — Reader/download parity manifest

- Added a deterministic parity manifest derived from symbol, locale, selected depth, report checksum, page assignment, section content and source citations.
- The PDF endpoint recomputes the manifest and rejects a mismatching report with HTTP `409 parity_manifest_mismatch`.
- Download response headers expose fixture, compositor, citation, parity and accessibility receipts for release inspection.
- Reader and downloaded PDF both expose the same manifest key.
- Boundary: this verifies payload, page-order and content-contract parity; it does not falsely claim pixel-perfect raster parity.

## PASS584 — semantic Reader and PDF metadata

- Reader document now has an explicit document role, one document title and ordered page headings.
- Added Arrow Left/Right and Home/End page navigation with focus transfer and reduced-motion handling.
- Page buttons expose controlled section IDs and current-page state.
- Generated PDFs include document language, title/author/subject metadata and display-title preference.
- Text remains selectable.
- Accessibility boundary is explicit: Reader semantics are improved, but generated PDFs are not claimed as fully tagged PDFs.

## PASS585 — shared OHLCV crosshair inspector

- Shield, VLM and Real Markets now read one selected-candle contract for time, open, high, low, close, volume and percentage change.
- Mouse hover remains temporary; tap/click pins a candle for inspection.
- Added keyboard candle inspection, half-window history movement, zoom, reset, latest and oldest controls.
- Added a localized live-region summary for assistive technology.
- Crosshair status IDs use React `useId`, preventing duplicate IDs when multiple charts render on one page.

## PASS586 — mobile chart gesture contract

- Added axis locking with an intent threshold and horizontal bias.
- One-finger vertical movement remains native page scrolling; horizontal intent pans chart history.
- Pinch zoom remains anchored to the gesture midpoint.
- Pointer cancellation and second-pointer transitions are handled without leaving a stale drag state.
- Chart controls now meet a 44 px minimum target and the chart uses `touch-action: pan-y`.
- Print, reduced-motion, sticky Reader navigation and stable scrollbar CSS were tightened in the same UI pass.

## Changed public surfaces

- Velmère Lens report construction
- Full-screen PDF Reader and navigation
- Downloadable four-page A4 PDF route
- Shared Shield / VLM / Real Markets chart runtime
- Mobile chart interaction and accessibility layer
- Production build verifier chain

## Validation completed

- PASS580–586 verifier: PASS.
- PASS573–579 regression verifier: PASS.
- PL / DE / EN i18n check: PASS.
- Vercel preflight: PASS, 862 project files scanned.
- TypeScript parser sweep: PASS, 869 TS/TSX files, 0 syntax diagnostics.
- Pure TypeScript semantic check for PASS580–586 helper modules: PASS.
- Runtime helper checks: fixture matrix, compositor, citations, parity determinism, accessibility boundary, crosshair inspector and gesture axis lock: PASS.
- ZIP structure and SHA-256 are verified during packaging.

## Environment boundary

The focused dependency-backed typecheck was attempted but cannot complete in this package-only environment because `node_modules` is absent. Missing packages include Next.js, React, Lucide, Zod and Node type declarations. The environment runs Node.js 22.16.0 while the project production contract is Node.js 20.x. A full `next build` is therefore not claimed. Use the clean Node.js 20 workflow in `PASS586_BUILD_NOTES.md` before deployment.
