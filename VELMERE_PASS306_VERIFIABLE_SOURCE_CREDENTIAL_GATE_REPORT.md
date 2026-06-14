# PASS306 — Verifiable Source Credential Gate

PASS306 continues the Velmère A–M granular build map and keeps AI Brain / Shield / Lens source-proof lanes separate.

## Error-first sweep

Executed before product changes:

- `npm run verify:pass305-selective-disclosure-vault-gate` — PASS
- `npm run check:i18n` — PASS
- `npm run vercel:preflight` — PASS
- `npm run typecheck` — still blocked by inherited missing local Next/React/Node/lucide/next-intl type packages and old prop errors; not marked green.

Regression guards still cover:

- `mode is not defined` layout sentinel regression
- Shield search modal quarantine
- Shield Map investigator suggestion quarantine
- forbidden dark-pattern wording

## Research direction

- MEXC market streams / order book depth inspired short-lived source credentials with explicit expiry.
- MEXC Proof of Reserves inspired transparent snapshot context without broad safety language.
- LVMH / Aura Digital Product Passport inspired provenance-style source identity, lifecycle traceability and selective proof visibility.

## New module

- `lib/market-integrity/verifiable-source-credential-gate.ts`
- `scripts/verify-pass306-verifiable-source-credential-gate-safety.mjs`

## New UI innovation

**Verifiable Source Credential**: a short-lived proof handshake between source adapters, depth snapshots, reserve snapshots, DPP-style provenance, freshness timecodes and Selective Disclosure Vault.

The credential has:

- `credentialState`
- `credentialScore`
- `issuerQuorum`
- `expirySeconds`
- `disclosureClass`
- `attestationPressure`
- `proofHashHint`

Customer copy can only show the credential class supported by the evidence lanes. Operator proof remains richer than customer-visible proof.

## Integrated surfaces

- VLM Browser / Lens: `data-pass306-verifiable-source-credential="vlm-browser"`
- Lens result receipt: `data-pass306-result-credential="verifiable-source-receipt"`
- Shield terminal: `data-pass306-verifiable-source-credential="shield-terminal"`
- Shield Map: `data-pass306-verifiable-source-credential="shield-map"`

## Product delta

| ID | Area | Previous | Current | Change |
|---|---|---:|---:|---:|
| K01 | Durable audit ledger / credential receipt planning | 46% | 49% | +3% |
| K04 | Storage/source adapter contract | 66% | 68% | +2% |
| K07 | Retention policy / short-lived proof expiry | 20% | 24% | +4% |
| M08 | PDF/browser replay boundary | 61% | 63% | +2% |
| L06 | Adapter timeouts / fallbacks | 62% | 64% | +2% |
| D16 | Source confidence lanes | 100% | 100% | +0% |
| M01 | Velmère Shield Report | 84% | 85% | +1% |
| A06 | Runtime observability | 90% | 91% | +1% |

**PASS306 product delta:** +15% on touched rows.

## Safety / psychology

- FOMO is inverted into credential friction.
- Elite status is earned by issuer quorum, expiry and selective disclosure.
- No countdowns, trade action commands, broad safety language or stale-source promotion.
- Proof hash hint is a local continuity marker, not external verification.

<!-- PASS306 marker: Verifiable Source Credential Gate active. -->
