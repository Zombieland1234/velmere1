# PASS407 — Terminal Exact Payload Orbit

## Scope
PASS407 continues the Browser / Shield / Shield Map / Real Markets cleanup with a stricter exact-payload rule:

- one runtime close bus for search suggestions before modal/PDF/download/scroll/tab switch,
- one Orbit 360 VLM Brain surface,
- one locale-aware resolved payload for preview and downloaded PDF,
- one Real Markets provider-ready expansion without fake-live claims.

## Implemented

### Browser / Lens PDF
- Added `PASS407 TERMINAL EXACT PAYLOAD ORBIT` as PDF page 33.
- Added HTML preview section `pass407-terminal-exact-payload-orbit`.
- Added `pass407Readout`, `pass407TruthOrbitTimeline`, `pass407TerminalPayloadIntegrityOrbit`, security copy and research bridge to the resolved Lens report object.

### Search runtime
- Added `PASS407_RUNTIME_CLOSE_EVENT`.
- Wired Browser, Shield, Shield Map and Real Markets to listen to and emit PASS407 close events.
- Kept PASS406 bus compatibility so older surfaces still close while PASS407 becomes the latest contract.

### Real Markets / Real Stocks
- Added PASS407 provider-ready rows through `buildPass407MarketCoverageUniverse()`.
- Added deterministic visual patches and pseudo-price lanes for new assets.
- Wired PASS407 rows into the Real Markets catalog API.
- Real Markets modal keeps Shield-style sequence: logo → advanced candles → timeframe → Basic / Pro / Advanced → Orbit 360 VLM Brain → field readout.

### Orbit 360 Brain
- Added PASS407 exact-payload Orbit 360 panel with VLM coin, blue shell/core, 176 source packets, timer, timeline and 10 / 14 / 20 field output.
- Stale pass-history remains guard evidence; latest public path is PASS407.

### Security / Research copy
- Kept public language compact: private-key boundary, signature proof, entropy quality, provider truth, redaction and audit/replication/falsification.
- No profit claims, fake-live claims or fake scarcity.

## Validation

Passed:

- `npm run verify:pass407-terminal-exact-payload-orbit`
- `npm run verify:pass406-terminal-payload-integrity-orbit`
- `npm run check:i18n`
- `npm run vercel:preflight`

Notes:

- PASS407 parser sweep scanned 712 TS/TSX files.
- Vercel preflight scanned 707 files.
- Full `next build/typecheck` is not marked green because the export ZIP has no full `node_modules` dependency tree.
