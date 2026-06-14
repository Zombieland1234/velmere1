# PASS321 — Public Copy Polish + Concierge Proof Whisper

## What changed

PASS321 removes pass labels, raw `/100` proof scores and operator-like wording from customer-facing commerce surfaces. Internal guard markers remain in code, but the public storefront reads like a premium showroom instead of a build log.

## New UI innovation

**Concierge Proof Whisper** — a small, calm proof cue that converts internal evidence into customer-safe language:

- fit first,
- material clear,
- delivery and returns before payment,
- quiet waitlist when checkout proof is not ready,
- no fake scarcity or wallet pressure.

## Public surfaces touched

- Home
- Shop
- Product detail
- Cart
- Checkout

## Safety boundary

The gate explicitly hides PASS ledger labels, raw operator scores, MEXC-style expiry internals, provider audit fields and redacted telemetry from customer UI.

## Research mapping

- MEXC live-source patterns require expiry and freshness windows; customer UI should not imply permanent live proof.
- MEXC Proof of Reserves is treated as a snapshot context, not a safety promise.
- LVMH/Aura Digital Product Passport patterns support traceability/authenticity in short customer-facing proof cues, not audit walls.

## Delta

- B01 Home hero / first impression: +2
- B03 Visual rhythm / reduced clutter: +3
- B04 Conversion path: +3
- G01 Product cards / customer clarity: +2
- G02 Product detail truth: +3
- G03 Cart/checkout surface: +3
- H05 Private digital layer copy: +1
- J03 Responsive layout / public density: +2
- M04 Safe export wording / customer copy: +2

PASS321 total: +21 points.
