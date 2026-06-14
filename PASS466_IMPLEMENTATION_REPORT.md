# Velmère PASS466 — Browser Markets + confidence waterfall + focused A4 PDF

## Scope
PASS466 continues from PASS465 and closes the remaining Browser/PDF gaps visible in the user review:

1. Velmère Browser must search stocks, ETFs and REITs from the same product catalog as Real Markets.
2. Suggestions must stay lightweight and must not spend keyed provider quota while the user types.
3. A committed result may load the detailed provider, fundamental and SEC/XBRL evidence packet.
4. Basic / Pro / Advanced must remain three distinct report products; choosing Basic must not reveal the complete Pro and Advanced matrix.
5. Confidence must be explained as a visible sequence of evidence caps, not presented as one unexplained percentage.
6. Direct SEC filing evidence should be available from the human-readable result and PDF reader when a filing URL exists.

## Implemented

### Shared Real Markets catalog in Browser
- Added `lib/search/pass466-real-market-lens.ts`.
- Browser market discovery is generated from `buildPass419MarketCoverageUniverse`, the same base universe used by Real Markets.
- Added a new Browser mode: `market` / `Rynki` / `Märkte` / `Markets`.
- Supported discovery classes are stock, ETF and real estate/REIT.
- Results are deduplicated by asset class and normalized symbol.
- Visual metadata is inherited from the Real Markets visual patch layer.

### Suggest versus detail contract
- Search requests now carry `intent=suggest|detail`.
- Typing and suggestion opening use `suggest` and do not call the keyed Alpha Vantage provider.
- A committed exact market selection uses `detail` and may request the source-bound provider snapshot.
- This protects provider limits without returning an artificially complete result during autocomplete.

### Market evidence packet
Detailed market results can carry:
- quote and provider state,
- market cap or fund net assets,
- exchange and provider functions,
- fundamental quality/confidence state,
- SEC/XBRL state, coverage, filing form/date and direct filing URL,
- revenue, profitability and valuation fields,
- FCF, leverage and current-ratio fields,
- ETF concentration, overlap and top holdings.

Missing fields remain source requirements. They are not converted to zero or client-facing `unknown` values.

### Six-stage confidence waterfall
Added `lib/market-integrity/pass466-confidence-waterfall.ts` with a monotonic confidence boundary:

1. identity,
2. primary source,
3. second source,
4. freshness,
5. fundamentals,
6. final product boundary.

Each stage may preserve or lower the confidence ceiling; no missing source can increase it. The same waterfall is used in:
- Browser result cards,
- the human-readable PDF reader,
- the binary A4 PDF contract.

### Focused Basic / Pro / Advanced output
- The depth selected during V-forge remains attached to the report.
- The human reader now renders only the selected tier matrix.
- Basic no longer displays Pro and Advanced rows underneath it.
- Pro and Advanced keep their own density and confidence boundaries.
- Binary PDF remains four pages while page four is reorganized around the selected tier and confidence waterfall.
- Preview and download continue to use the same generated Blob.

### SEC filing UX
- Browser result cards expose a direct SEC filing link when a source-bound URL exists.
- The human-readable PDF view exposes the same filing link.
- The binary PDF carries filing state/label in the evidence contract without pretending the URL exists when it is absent.

### Accessibility and modal behavior retained
PASS466 preserves:
- the four-stage V animation,
- selected-depth controls during generation,
- one-Blob preview/download parity,
- background scroll lock,
- Escape close,
- focus trap and focus restoration,
- download icon,
- PL/DE/EN copy.

## Validation

Passed in the sandbox:

```text
verify:pass453-unified-intelligence-handoff ✅
verify:pass454-evidence-dense-human-analysis ✅
verify:pass455-human-decision-pdf-forge ✅
verify:pass456-asset-aware-pdf-realmarkets ✅
verify:pass457-shield-ai-progressive-disclosure ✅
verify:pass458-provider-truth-router ✅
verify:pass459-keyed-provider-pdf-ai ✅
verify:pass460-provider-consensus-cache ✅
verify:pass461-live-venue-health-orbit ✅
verify:pass462-cross-venue-fundamentals ✅
verify:pass463-canonical-pair-coverage ✅
verify:pass464-fundamental-quality ✅
verify:pass465-sec-xbrl-pdf-hotfix ✅
verify:pass466-browser-market-pdf-waterfall ✅
check:i18n ✅
vercel:preflight ✅ — 775 scanned files
```

PASS466 verifier ran semantic waterfall assertions and parsed 779 TS/TSX files.

## Not executed
- Full `next build` was not run because the package does not contain `node_modules`.
- Browser-level PDF rendering/download was not exercised in Chromium in this sandbox.
- Live Alpha Vantage and SEC detail probes require `ALPHA_VANTAGE_API_KEY` and `SEC_USER_AGENT`.

## Recommended next pass
PASS467 should focus on the last runtime/public-beta gate:
- Playwright flow for Browser → market search → V forge → selected tier → preview → download → close,
- measured A4 overflow checks for all three depths,
- persistent provider quota ledger and retry telemetry,
- unified market result handoff into Shield and Orbit 360.
