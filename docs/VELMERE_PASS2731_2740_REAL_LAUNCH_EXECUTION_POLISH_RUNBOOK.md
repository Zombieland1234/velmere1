# VELMERE PASS2731–2740 — Real Launch Execution Polish Runbook

This runbook is the founder-facing live proof handoff. It intentionally does **not** claim production GO until live artifacts exist.

## Goal

Convert the offline-ready audit architecture into a repeatable launch execution sequence:

1. clean CI proof,
2. Vercel preview proof,
3. Supabase RLS proof,
4. Stripe replay/refund/chargeback proof,
5. Playwright visual/accessibility/performance proof,
6. data freshness/quorum proof,
7. redacted release-board import,
8. PASS2680 replay,
9. external review attachment.

## Hard stop rules

- No `LIVE_WORLD_CLASS_GO` without artifact hashes for every live lane.
- No raw webhook payload, service role key, provider raw payload, raw Playwright trace, screenshot, customer PII or operator private note in public release-board output.
- Any P0 customer-critical bug freezes the launch claim until fixed and re-run.
- Refund/chargeback/revoked state must lock paid PDF/support artifacts.
- Stale data must lower confidence and show a stale warning.

## Copy-paste live deck

```bash
npm ci
npm run typecheck
npm run build
npm run check:i18n
npm run verify:pass2731-2740-real-launch-polish
VELMERE_PREVIEW_URL=https://your-preview.vercel.app npm run pass2686:external-smoke:runner
npm run pass2667:supabase-live-rls -- --live
npm run pass2668:stripe-webhook-replay -- --live
npm run pass2687:playwright-smoke
npm run pass2688:visual-regression
npm run pass2689:a11y-wcag
npm run pass2690:performance-runner
npm run pass2691:freshness-runner
npm run pass2692:conflict-runner
npm run pass2740:release-evidence-import -- --redacted
npm run pass2680:world-class-audit-launch-readiness-gate -- --live-bundle .velmere/live-proof/pass2740
```

## Customer beta feedback loop

Ask each beta user:

- Did Basic make sense in under 30 seconds?
- Was Pro vs Advanced clear before payment?
- Did locked/refunded/chargeback states make sense?
- Did missing evidence feel useful?
- Did mobile keep all buttons reachable?
- Did Angel stay inside the active evidence lane?

## Status page templates

Use calm, specific copy. Never include stack traces, raw provider errors or secrets.
