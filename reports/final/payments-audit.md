# VELMÈRE — PAYMENTS & STRIPE ARCHITECTURE AUDIT
**Checkout, Customer Portal, Local Payment Rails, and Webhook Hardening**

---

## 1. Stripe Payment Rails Audit
- **Active Enabled Rails**: Cards (Visa, MasterCard, Amex), Apple Pay, Google Pay, Link, Bancontact (Belgium), BLIK (Poland), EPS (Austria), Klarna (EU/US).
- **Hidden / Pending Rails**: Cartes Bancaires (Pending); PayPal, Revolut Pay, iDEAL, SEPA Direct Debit (Disabled); Przelewy24 (Ineligible).
- **Payment Method Visibility Rule**: Non-enabled payment methods are strictly hidden from the UI to prevent customer checkout confusion.

---

## 2. Webhook Security Verification
- **Constant-Time HMAC**: Stripe signatures verified via `crypto.timingSafeEqual` to prevent timing attacks.
- **Timestamp TTL**: Rejects webhook payloads with timestamp older than 300 seconds.
- **Append-Only Effect Ledger**: Incoming Stripe events are idempotently stored in an append-only ledger; duplicate events trigger an immediate HTTP 200 acknowledgment without re-executing entitlements.
