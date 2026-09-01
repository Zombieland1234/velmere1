# PASS4406 — No-Visual Import Pressure Map + Real Markets Reference Order Extraction

## Boundary

No JSX layout, CSS classes, animation timing, copy, tier gating, payment flow, provider logic or modal visual behaviour was intentionally changed.

## Why this pass exists

The Windows checkpoint showed that TypeScript was green, but `next build` could still hit a Node heap ceiling. PASS4403/PASS4404 reduced the TokenRiskModal monolith. PASS4405 started reducing CrossAsset/Real Markets pressure. PASS4406 continues that path with a deterministic import-pressure map and a helper-only extraction for Real Markets reference ordering.

## What moved

- Real Markets reference tab order.
- Real Markets preferred symbol order.
- Real Markets category sort weights.
- Real Markets reference row symbols.
- Generic reference asset ordering helper.
- Deterministic import-pressure scan target list.

## What stayed in the client component

- UI rendering.
- State management.
- Search behaviour.
- Modal behaviour.
- Labels/copy.
- Existing references to `cleanAssetSymbol` and `isVenueHealthAsset` via callback injection.

## Claim boundary

This pass does not claim a Windows full build. It prepares the codebase for the next batched Windows checkpoint and keeps public LIVE/topka wording blocked.
