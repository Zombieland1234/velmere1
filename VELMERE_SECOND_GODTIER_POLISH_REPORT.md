# Velmère Second God-Tier Polish Pass

Implemented after live UI review screenshots and feedback.

## Header and Navigation
- Reduced top navigation to only Men’s Collection and Women’s Collection.
- Kept the full menu as the home for New Drop, Lookbook, Archive, Square, VLM and Dashboard.
- Rebuilt the header as full-width high-contrast chrome so it remains readable over light and dark sections.
- Added wallet dropdown with full address, native balance, network, access status, and disconnect action.
- Preserved audio toggle but kept audio opt-in only.

## Bottom Terminal Strip
- Removed the intrusive full-width marquee strip.
- Kept UTC/EPOCH telemetry as a small bottom-right floating pill.

## Angel Concierge
- Replaced the left rail with a bottom-right Angel bubble.
- Angel panel remains a grey floating luxury card with stronger contrast.

## Home / Basic VLM Visuals
- Minimized the neural-brain information card so it no longer stretches awkwardly across the full visual.
- Expanded VLM Access layout to full-width and enlarged the right-side VLM visual.
- Rebuilt Basic/Pro transition overlay with a professional split-panel spring animation.

## Square / Account Gating
- Added `AuthGate` with a premium modal for restricted areas.
- Square now requires account login, registration simulation, or wallet connection before displaying the feed.
- Dashboard and Account are also gated.
- Login form now stores a local account session and includes Google/wallet entry stubs.

## Archive
- Rebuilt Archive into a compact three-card luxury archive grid.
- Reduced oversized imagery and added optimized technical overlays.
- Kept VLM token gate around archive assets.

## Validation
- i18n check passed across PL/EN/DE.
- TypeScript/TSX parse check passed across 202 files.
