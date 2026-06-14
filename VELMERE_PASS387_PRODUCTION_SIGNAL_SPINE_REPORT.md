# PASS387 — Production Signal Spine

## Focus
PASS387 continues the Velmère Shield / Browser / Real Markets convergence, but keeps the public launch surface clean instead of exposing every internal pass.

## Implemented
- Added `lib/market-integrity/pass387-production-signal-spine.ts`.
- Added 30 provider-ready real-market rows: travel, commerce, Asia tech, EU luxury, Swiss defensives, regional FX and commodities.
- Added PASS387 visual/logo fallback map and pseudo-price preview patches.
- Real Markets now includes PASS387 rows in the unified catalogue and `/api/market-integrity/real-markets/catalog`.
- Real Markets modal now includes `PASS387.production_signal_readout` with 10/14/20 fields for Basic/Pro/Advanced.
- Public UI hides older PASS383–PASS386 readouts under the PASS387 surface so users see one final terminal, not a pass-history wall.
- Browser PDF route adds page 20: `PASS387 PRODUCTION SIGNAL SPINE`.
- Browser HTML preview adds `pass387-production-signal`, with the same readout, provider matrix and security copy as the PDF object.
- Security page adds one public security section: private key, signature proof, provider truth, entropy quality, redacted report.
- Research Lab adds one production explanation bridge: banks → cryptography → ECC/BTC → real RNG → primes → Bajak Protocol.

## Guardrails
- No fake-live: broad catalog is provider-ready, but strong status waits for timestamp, OHLCV, cache age, fallback and second source.
- Wallet / ECC / RNG is educational only. No private-key generation instructions, no seed phrase handling, no bypass or key recovery guidance.
- Bajak Protocol remains framed as numerical audit / finite reconstruction / falsification / replication, not a formal proof claim.
- Preview, modal and downloaded PDF remain tied to one resolved report object and selected locale.

## Validation
- `npm run verify:pass387-production-signal-spine`
- `npm run verify:pass386-exact-mirror-terminal`
- `npm run check:i18n`
- `npm run vercel:preflight`
