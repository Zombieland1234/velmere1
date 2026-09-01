# PASS2713 — Privacy / Retention / Deletion

Status: implemented as offline/productization contract in PASS2711-2720.

## Purpose
Define what is stored, redacted, retained and deleted.

## Customer-safe rule
Public receipts show hashes/status only.

## Operator rule
Private vault boundaries and support minimization are mandatory.

## Acceptance criteria
- Retention schedule
- Deletion request status
- Private vault boundary
- Public receipt privacy

## Live proof note
This pass does not fake live production proof. The founder/operator must execute CI, Vercel preview, Supabase RLS, Stripe replay, alert sink, Playwright/visual/a11y/performance, release-board import, PASS2680 replay and external review before claiming production world-class readiness.
