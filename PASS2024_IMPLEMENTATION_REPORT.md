# PASS2024 — Paid Advanced Audit, Advanced PDF and VLM Advanced gates

## Scope
PASS2024 implements paid access for the three premium VLM surfaces:

1. **VLM Advanced Analysis** — the third Advanced card/tile: **4.99€** one-time access for the selected asset.
2. **VLM Advanced PDF Report** — premium Browser/Lens PDF: **14.99€** one-time access for the selected result.
3. **Velmère Advanced Audit** — human-reviewed audit: **89.99€**, includes the Advanced PDF for that audit request.

Basic and Pro remain low-friction. Advanced is gated by checkout and a signed server token.

## Implemented

| Area | Before | After | Notes |
|---|---:|---:|---|
| Advanced VLM third card | 45% | 86% | Frontend checkout gate + backend VLM API 402 gate for advanced depth. |
| Advanced PDF paid flow | 35% | 88% | Browser/Lens Advanced PDF requires paid access token before JSON/PDF generation. |
| Advanced Audit 89.99€ | 72% | 90% | Direct Advanced audit submission is blocked unless paid token verifies. |
| Service checkout separation | 15% | 84% | VLM services now use a dedicated checkout endpoint, separate from clothing/cart checkout. |
| Paid access token | 0% | 86% | Server HMAC token binds payment to product + asset/context + depth. |
| Checkout success token save | 0% | 82% | Success page verifies Stripe session and stores access on the device. |
| API bypass protection | 30% | 89% | Audit, PDF, VLM and legacy brain routes now return 402 without valid token. |
| Production readiness | 55% | 78% | Still needs Stripe env, service-ready flag, DB/webhook persistence and real test payment. |

## Pricing decision

| Product | Price | Why |
|---|---:|---|
| VLM Advanced Analysis | 4.99€ | Low-friction one-time unlock for the third Advanced card. Good for conversion without making Basic/Pro feel useless. |
| VLM Advanced PDF | 14.99€ | Premium report/document price. Stronger perceived value than a simple click, still accessible. |
| Velmère Advanced Audit | 89.99€ | Human-reviewed hybrid review: VLM system + Velmère verification + private report. Includes the Advanced PDF for that audit. |

## Security model

- Checkout creates a Stripe payment session only when `VELMERE_SERVICES_COMMERCIAL_READY=true`.
- Checkout verification retrieves the Stripe session and requires `payment_status === "paid"`.
- Server issues a signed VLM paid access token after payment confirmation.
- Token is bound to:
  - product ID,
  - selected surface,
  - locale,
  - asset/result/request identity,
  - depth,
  - Stripe session ID,
  - expiry.
- Protected APIs reject unpaid Advanced requests with `402 payment_required`.
- The paid token is server-signed and cannot be forged from localStorage alone.

## Environment variables

```env
VELMERE_SERVICES_COMMERCIAL_READY=false
VELMERE_PAID_ACCESS_SECRET=
```

Production must set:

```env
CHECKOUT_MODE=stripe
STRIPE_SECRET_KEY=sk_live_or_test
NEXT_PUBLIC_SITE_URL=https://your-domain
VELMERE_SERVICES_COMMERCIAL_READY=true
VELMERE_PAID_ACCESS_SECRET=minimum_32_random_characters
```

## Tests run

- `scripts/verify-pass2015-vlm-security-intelligence.mjs`
- `scripts/verify-pass2016-adversarial-shadow-brain.mjs`
- `scripts/verify-pass2017-signed-analysis-receipt.mjs`
- `scripts/verify-pass2018-ed25519-public-receipt.mjs`
- `scripts/verify-pass2019-evidence-quorum-shadow-security.mjs`
- `scripts/verify-pass2020-source-integrity-sentinel.mjs`
- `scripts/verify-pass2021-temporal-consistency-sentinel.mjs`
- `scripts/verify-pass2022-narrative-drift-decision-reversibility.mjs`
- `scripts/verify-pass2023-vlm-audit-product.mjs`
- `scripts/verify-pass2024-vlm-paid-access.mjs`
- TypeScript transpile syntax check for changed PASS2024 TS/TSX files.

## Honest limitations

- Full Next.js build was not confirmed because the package has no `node_modules`.
- Live Stripe payment was not executed because production/test Stripe environment values are not present here.
- Access token is stored on the user device for now. For production-grade account portability, add DB persistence and a Stripe webhook.
- This pass gates the Advanced VLM surfaces; it does not change clothing checkout, product pages, layout or broad UI design.
