# Velmère PASS468 — Browser → PDF → Shield / Orbit evidence handoff

## Scope
PASS468 continues from PASS467 and removes duplicate asset discovery between Velmère Browser, Shield and Orbit 360. The committed Browser result and selected PDF depth can now be handed directly to either target through a short-lived, checksum-protected session packet.

The packet is deliberately not an analysis authority. It is marked `trustedForDisplayOnly` and `requiresFreshTargetScan`, so Shield still calls its own scan path and Shield Map still calls its Investigator path. This avoids converting session storage into a fake source of truth.

## Implemented

### Versioned handoff packet
Added `pass468-browser-shield-orbit-handoff-v1` with:
- payload id and deterministic checksum;
- 30-minute expiry;
- query, symbol, title and asset category;
- selected Basic/Pro/Advanced depth;
- source confidence, source mode and source labels;
- missing evidence list;
- compact market/fundamental/venue snapshot;
- explicit display-only and fresh-target-scan boundaries.

Packets are stored in `sessionStorage`, not in the URL. The URL carries only the packet id and sanitized route parameters.

### Browser and PDF actions
Every committed Browser result now exposes:
- Open Shield;
- Open Orbit 360;
- Generate PDF.

The same Shield and Orbit actions are available in the PDF preview toolbar. When the user selected Pro during the V forge, the handoff carries Pro rather than falling back to Advanced.

### Shield target
Shield reads the packet only when the route uses `handoff=pass468`. It validates packet identity against the route query and shows a compact context strip containing depth, source confidence, source mode and venue/fundamental state.

The real target result still comes from `scanToken(cleanRouteScan)`. PASS468 does not call `setResult` with packet data.

### Orbit 360 target
Shield Map accepts both legacy PASS453 and PASS468 handoffs. It shows the same context strip and then executes `runInvestigatorScan(null, requested)` for the selected instrument.

### Runtime and E2E gates
The PASS468 verifier checks:
- required contract fields;
- session persistence;
- checksum rejection after tampering;
- packet expiry;
- Shield and Orbit URL generation;
- Browser/PDF handoff controls;
- fresh target scan calls;
- absence of packet-to-result injection;
- TypeScript transpilation for changed files;
- regression of the result-before-PDF-capsule DOM order.

An optional Playwright scenario was added. It mocks deterministic search/PDF responses and checks:
1. result before the PDF capsule;
2. Pro selection during V forge;
3. preview/download Blob parity;
4. background scroll lock;
5. preview close;
6. Orbit route packet id;
7. preserved BTC identity and fresh-scan boundary.

## Validation

Passed in this environment:

```text
PASS453–PASS468 regression chain ✅
PASS468 packet round-trip semantics ✅
PASS468 tamper and expiry rejection ✅
PASS468 Shield/Orbit URL semantics ✅
780 TS/TSX parser sweep through regression gates ✅
i18n PL/DE/EN ✅
Vercel preflight ✅ — 776 scanned files
```

## Not executed
- Full `next build`: package does not contain `node_modules`.
- Playwright/Chromium: Playwright is not installed in the sandbox. The executable test is included as `npm run e2e:pass468-browser-shield-orbit`.
- Live provider smoke: still requires deployment connectivity and production secrets where applicable.

## Recommended next pass
PASS469 should instrument real A4 overflow/page-density checks for all three PDF depths, add a download receipt/event ledger and expose a short packet acknowledgement inside Shield AI without treating the Browser packet as evidence.
