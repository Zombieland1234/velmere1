# PASS419 — Terminal Payload Stabilizer

Scope: bugfix-first parity pass for Velmère Shield, Velmère Browser/Lens and Velmère Real Markets.

## Implemented

- Search stays max-three across Browser, Shield and Real Markets: exactly three suggestions maximum per surface.
- Browser suggestions remain inline under the real input; the older floating portal stays disabled.
- Search ranking uses deferred input, normalized keys and stable de-dupe to reduce typing lag.
- Real Markets stays chart-first and mirrors Shield behavior without spawning Orbit 360 in the modal.
- Basic / Pro / Advanced returns deterministic 10 / 14 / 20 payload-bound fields.
- PDF parity is preserved by building HTML preview and downloaded PDF from the same resolved locale payload.
- Object metrics like `{ price, change }` are flattened with `pass419SafeText` before React render.
- Real Markets universe gains provider-ready ETF, FX, commodities, REIT and AI/cyber instruments.
- Browser preview and downloaded PDF include PASS419 page 42 from the same resolved locale payload.
- Security/Research copy remains public-safe: layered protections, redacted internals, audit/replay evidence and conservative research wording.

## Runtime rule

Orbit remains parked in Real Markets until it is rebuilt as a lazy isolated component with its own crash boundary. Current priority is stable search, stable chart gestures, exact payload parity and no React object kernel panic.

## Validation

- `npm run verify:pass419-terminal-payload-stabilizer`
- `npm run check:i18n`
- `npm run vercel:preflight`
