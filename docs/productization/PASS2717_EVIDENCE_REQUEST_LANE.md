# PASS2717 — Evidence Request Lane

Status: implemented as offline/productization contract in PASS2711-2720.

## Purpose
Turn missing proof into next actions.

## Customer-safe rule
No proof means lower confidence, not invented safety.

## Operator rule
Operators get typed evidence quality scores.

## Acceptance criteria
- Evidence request types
- Expiry warnings
- Trust Delta recheck
- Evidence quality score

## Live proof note
This pass does not fake live production proof. The founder/operator must execute CI, Vercel preview, Supabase RLS, Stripe replay, alert sink, Playwright/visual/a11y/performance, release-board import, PASS2680 replay and external review before claiming production world-class readiness.
