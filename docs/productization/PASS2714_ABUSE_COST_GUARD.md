# PASS2714 — Abuse / Cost Guard

Status: implemented as offline/productization contract in PASS2711-2720.

## Purpose
Prevent provider, AI and PDF cost drain.

## Customer-safe rule
Customers see retry/pending states, not raw failures.

## Operator rule
Operators see redacted abuse telemetry.

## Acceptance criteria
- Tier budgets
- Rate limits
- Circuit breakers
- PDF queue fallback

## Live proof note
This pass does not fake live production proof. The founder/operator must execute CI, Vercel preview, Supabase RLS, Stripe replay, alert sink, Playwright/visual/a11y/performance, release-board import, PASS2680 replay and external review before claiming production world-class readiness.
