# Velmère Master Build Map — PASS468

## A. Browser / Lens
- [x] Preserve committed-result-first hierarchy from PASS467.
- [x] Keep PDF capsule below the committed result.
- [x] Add direct Shield and Orbit 360 actions to every committed result.
- [x] Add the same Shield and Orbit actions inside PDF preview.
- [x] Preserve the selected Basic/Pro/Advanced depth in every handoff.
- [ ] Next: keyboard active-descendant navigation through suggestions.

## B. Search and result identity
- [x] Use normalized symbol/title/id as the handoff query.
- [x] Keep the selected asset unchanged across Browser, PDF, Shield and Orbit.
- [x] Continue aborting stale suggestion/detail/PDF requests.
- [x] Do not inject Browser packet data as a finished target analysis.
- [x] Require a fresh Shield/Investigator scan after handoff.

## C. PASS468 evidence packet
- [x] Add a versioned Browser → Shield/Orbit packet contract.
- [x] Include payload id, timestamp, expiry, symbol, category and PDF depth.
- [x] Include source state, source confidence, source labels and missing-data list.
- [x] Include a compact price/market-cap/volume/freshness snapshot.
- [x] Mark packet data as display-only and target-scan-required.
- [x] Add deterministic checksum validation.
- [x] Reject tampered and expired packets.
- [x] Keep packet lifetime limited to 30 minutes.

## D. Shield handoff
- [x] Read PASS468 packet by packet id from session storage.
- [x] Validate query identity before displaying packet context.
- [x] Show depth, source confidence, source mode and evidence state.
- [x] Continue running Shield's own `scanToken` path.
- [x] Preserve legacy PASS453 handoff compatibility.
- [x] Preserve route handoff onward to Shield Map.

## E. Orbit 360 / Shield Map handoff
- [x] Accept PASS453 and PASS468 route versions.
- [x] Read packet context without trusting it as Investigator output.
- [x] Show depth, source confidence, source mode and evidence state.
- [x] Continue running the Investigator scan for the requested asset.
- [x] Preserve the return route to Lens.

## F. Basic analysis
- [x] Carry selected `basic` depth through Browser and preview actions.
- [x] Preserve price, market cap/net assets, 24h, volume and source context.
- [x] Keep target-side analysis fresh and independent.

## G. Pro analysis
- [x] Carry selected `pro` depth through Browser and preview actions.
- [x] Preserve second-source and freshness context.
- [x] Preserve source confidence and missing-evidence context.
- [x] Verify Pro selection in the optional E2E scenario.

## H. Advanced analysis
- [x] Carry selected `advanced` depth through Browser and preview actions.
- [x] Preserve venue/fundamental state where available.
- [x] Keep SEC/XBRL, venue and provider evidence display-only until target scan.
- [x] Prevent session storage from becoming an analysis authority.

## I. PDF forge / preview / download
- [x] Keep four-stage V forge.
- [x] Preserve selected depth in preview.
- [x] Preserve one-Blob preview/download parity.
- [x] Keep background scroll lock and focus restoration.
- [x] Add test ids for Basic/Pro/Advanced, close, Shield and Orbit actions.
- [ ] Browser-level PDF pixel/A4 overflow measurement still pending.

## J. Automated runtime gates
- [x] Add static PASS468 verifier.
- [x] Add TypeScript transpile checks for all changed TS/TSX files.
- [x] Add semantic packet round-trip test.
- [x] Add checksum tampering test.
- [x] Add expiry test.
- [x] Add Shield/Orbit URL test.
- [x] Add trust-boundary scan preventing packet injection as target result.
- [x] Add optional Playwright Browser → PDF → Orbit flow.
- [ ] Execute Playwright after installing browser runtime.

## K. i18n and accessibility
- [x] Add Shield and Orbit labels in PL/DE/EN.
- [x] Preserve dialog, focus trap, Escape and scroll-lock behavior.
- [x] Preserve result-first screen-reading order.
- [x] Keep context chips short and non-authoritative.

## L. Validation and blockers
- [x] PASS453–PASS468 regression chain.
- [x] PASS468 semantic handoff tests.
- [x] 780 TS/TSX parser sweep through regression gates.
- [x] i18n validation.
- [x] Vercel preflight — 776 scanned files.
- [x] ZIP integrity and SHA-256.
- [ ] Full `next build` pending installed `node_modules`.
- [ ] Playwright/Chromium run pending browser dependency.
- [ ] Live provider smoke pending deployment networking and secrets.

## M. Next pass
PASS469 — A4 overflow telemetry for Basic/Pro/Advanced, download event receipts, responsive PDF toolbar cleanup and target-side packet acknowledgement in the Shield AI conversation.
