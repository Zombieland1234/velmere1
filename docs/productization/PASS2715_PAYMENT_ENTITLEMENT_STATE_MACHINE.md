# PASS2715 — Payment / Entitlement State Machine

Status: implemented as offline/productization contract in PASS2711-2720.

## Purpose
Make paid access deterministic across checkout, refund, dispute and regrant.

## Customer-safe rule
Refund/chargeback/revoked states lock paid artifacts.

## Operator rule
Support reconciles without raw payload exposure.

## Acceptance criteria
- Pending does not unlock
- Refund locks PDF
- Chargeback locks support packet
- Regrant requires safe reason

## Live proof note
This pass does not fake live production proof. The founder/operator must execute CI, Vercel preview, Supabase RLS, Stripe replay, alert sink, Playwright/visual/a11y/performance, release-board import, PASS2680 replay and external review before claiming production world-class readiness.
