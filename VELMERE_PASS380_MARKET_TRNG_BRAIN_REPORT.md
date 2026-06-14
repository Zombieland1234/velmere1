# PASS380 — Market/TRNG Brain Contract

## Priority fixed in this pass
- Real Markets gets another provider-ready institutional extension and is wired into the existing Real Markets catalog endpoint.
- The catalog route now includes PASS379 and PASS380 universes; previous endpoint stopped at PASS378.
- Browser PDF generation no longer appends the PASS379 page unconditionally to every PDF page. PASS379 is gated to page 13 and PASS380 is gated to page 14.
- Preview/download parity is extended with one PASS380 report object section covering provider truth, VLM AI Brain, security, entropy/RNG, ECC/BTC and prime-lab boundaries.
- Research Lab and Security page get simpler public explanations: bank controls, signatures, entropy, ECC/BTC, prime audit, redacted proof.

## Product rule
Real Markets can list a broad global universe, but live confidence appears only after timestamp, OHLCV, cache age, fallback state and second source/reference proof.

## Safety / claim boundary
Bajak Protocol remains framed as numerical audit, falsification and replication path. No public claim of formal proof, no wallet-breaking instructions, no seed/private-key handling in public copy.

## Validation
- npm run verify:pass379-live-provider-brain
- npm run verify:pass380-market-trng-brain
- npm run check:i18n
- npm run vercel:preflight
