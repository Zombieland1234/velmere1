# Velmère progress — PASS586

| Pass | Delta | Delivered |
|---|---:|---|
| PASS580 | +9 | 27 deterministic PL/DE/EN × Basic/Pro/Advanced × density PDF fixtures |
| PASS581 | +12 | Pre-render A4 compositor with move/compact protection |
| PASS582 | +8 | Stable S01 source citations and compact on-demand evidence rail |
| PASS583 | +11 | Reader/download parity manifest and 409 mismatch gate |
| PASS584 | +9 | Semantic Reader, keyboard page navigation and PDF metadata boundary |
| PASS585 | +12 | Shared localized OHLCV/time/volume inspector across market surfaces |
| PASS586 | +13 | Axis-locked mobile pan/pinch, native vertical scroll and 44 px controls |
| **Total** | **+74** | **PDF integrity + premium chart interaction batch** |

## Current product state

- **Lens / PDF:** content is classified before render, source IDs match across Reader and download, and a deterministic manifest blocks drift.
- **Reader:** public document hierarchy is cleaner, page navigation is keyboard operable, and long evidence is progressively disclosed instead of covering the report.
- **Shield / Real Markets chart:** one candle inspector powers all public values; tap and keyboard inspection no longer depend on hover.
- **Mobile:** horizontal chart intent pans history while vertical intent keeps scrolling the page; pinch remains anchored.
- **Release:** PASS580–586 is in the production verifier chain and preserves the earlier PASS573–579 gate.

## Validation state

- Syntax, i18n, Vercel preflight, helper semantics and PASS573–586 regression gates: PASS.
- Complete dependency-backed typecheck and Next.js production build: pending clean Node.js 20.x installation.
