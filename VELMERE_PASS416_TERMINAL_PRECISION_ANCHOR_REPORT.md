# PASS416 — Terminal Precision Anchor

## Scope
- Browser/Lens search: stays inline under the real input, max 3 suggestions, old floating portal remains disabled.
- Shield search: max 3 suggestions, shared close bus and local-first clamp to reduce lag.
- Real Markets / Real Stocks: provider-ready expansion for ETFs, FX, commodities, real estate proxies and stocks.
- Real Markets modal: chart-first, Basic/Pro/Advanced deterministic fields, Orbit 360 still parked behind a future lazy crash boundary.
- PDF parity: HTML preview and downloaded PDF use one locale-stable payload, one field order and one checksum lane.
- Security/Research copy: simple public wording, redacted internals, replication/falsification language.

## Bugfix notes
- Sanitizer converts `{ price, change }` and nested metric objects into text before React render.
- Duplicate PASS407 JSX markers were removed from the Real Markets shell.
- PASS416 adds CSS clamps for 3-result panels and stable field wrapping.

## Validation
- `npm run verify:pass416-terminal-precision-anchor`
- `npm run verify:pass415-terminal-latency-stabilizer`
- `npm run check:i18n`
- `npm run vercel:preflight`
