# Velmère PASS465 — SEC/XBRL second source + PDF depth selector + runtime hotfix

## Scope
PASS465 continues from PASS464 and prioritizes two user-reported runtime crashes plus the Browser PDF UX request:

1. `TypeError: Cannot read properties of undefined (reading 'trim')` in `pass463-canonical-pair-coverage.ts`.
2. `Map is not a constructor` in `CrossAssetCollapseRadarPanel.tsx` caused by a `lucide-react` icon import shadowing native `Map`.
3. PDF generation should let the user choose Basic / Pro / Advanced during the V-forge instead of always generating all three tiers in the same report.
4. Fundamentals should gain SEC Companyfacts/XBRL as a second-source quality layer without pretending missing SEC data is proof.

## Implemented fixes

### Runtime hotfixes
- `safeUpper` and `stripQuote` now accept `string | null | undefined` and normalize defensively.
- Asset symbols are cleaned through `cleanAssetSymbol` in the Real Markets client.
- The `lucide-react` `Map` icon is imported as `MapIcon`.
- Native maps are created with `globalThis.Map` in the dedupe path.

### Selectable PDF depth
- Browser V-forge now displays Basic / Pro / Advanced selectors while the PDF is being generated.
- The selected tier is passed to `/api/search/lens-report?tier=basic|pro|advanced`.
- Preview filename includes the selected depth.
- Preview header shows the chosen tier badge.
- The PDF route keeps one Blob for preview/download parity, but renders a focused tier page.
- Basic remains human summary + price/market cap/24h/volume.
- Pro adds stronger evidence, source contract and provider plan.
- Advanced renders the full 20-field evidence layer with consensus/freshness/fundamental gates.

### SEC/XBRL quality layer
- Added `lib/market-integrity/pass465-sec-xbrl-quality.ts`.
- SEC Companyfacts/XBRL can compare Alpha Vantage statement metrics for:
  - revenue,
  - net income,
  - total assets,
  - liabilities,
  - equity,
  - operating cash flow,
  - capex.
- SEC submissions can provide filing cadence and direct filing archive URL.
- The layer adds `source_bound`, `partial`, `source_required` and `not_applicable` style states.
- Confidence is capped when SEC data is missing, stale, partial, or materially divergent.
- The Real Markets modal exposes SEC/XBRL as a separate second-source panel.

### Provider and API changes
- `pass459-alpha-vantage-provider.ts` now has cache and inflight dedupe for SEC Companyfacts and SEC submissions.
- `cross-asset` and `real-markets` routes expose the PASS465 contract marker.
- Real Markets catalog includes PASS465-ready metadata for stock/ETF/REIT discovery.

## Validation run

Passed locally in the sandbox:

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
check:i18n ✅
vercel:preflight ✅ — 773 scanned files
```

`verify:pass465-sec-xbrl-pdf-hotfix` parsed 777 TS/TSX files and ran runtime semantic checks.

## Not executed
- Full `next build` was not run because this package does not include `node_modules`.
- Live SEC / Alpha Vantage smoke tests require production configuration: `ALPHA_VANTAGE_API_KEY` and `SEC_USER_AGENT`.

## Next pass recommendation
PASS466 should focus on UI polish and field density:
- pixel-perfect PDF A4 spacing for each selected tier,
- Browser search for stock/ETF/REIT from the same search box,
- SEC filing link preview in the modal,
- visual confidence waterfall for price, venue, fundamentals and SEC/XBRL.
