# PASS2712 — Guided Audit Intake

Status: implemented as offline/productization contract in PASS2711-2720.

## Purpose
Route customer into token/project/document/market audit lanes.

## Customer-safe rule
Missing evidence is presented as a normal audit state.

## Operator rule
Operators receive typed cases and evidence requests.

## Acceptance criteria
- Asset type selected
- Upload/paste guidance
- Missing proof questions
- Account timeline stepper

## Live proof note
This pass does not fake live production proof. The founder/operator must execute CI, Vercel preview, Supabase RLS, Stripe replay, alert sink, Playwright/visual/a11y/performance, release-board import, PASS2680 replay and external review before claiming production world-class readiness.
